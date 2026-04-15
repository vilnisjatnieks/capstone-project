import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireStaff } from "@/lib/staff";
import { lookupByISBN, sanitizeISBN, isValidISBN } from "@/lib/isbn-lookup";
import { findWorkByISBN, upsertWork } from "@/lib/data/works";
import type { CreateWorkInput, ContributorInput } from "@/lib/data/works";
import {
    findAuthorByNameCaseInsensitive,
    createAuthor,
} from "@/lib/data/authors";

const COLUMN_MAP: Record<string, keyof CreateWorkInput> = {
    "Title": "title",
    "Date Published": "date_published",
    "Publisher": "publisher",
    "LCCN": "lccn",
    "ISBN-10": "isbn_10",
    "ISBN-13": "isbn_13",
    "Media Type": "media_type",
    "Number of Pages": "number_of_pages",
    "Language": "language",
    "Location": "location",
    "Call Number": "call_number",
};

function splitNames(raw: unknown): string[] {
    if (raw === null || raw === undefined) return [];
    return String(raw)
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

function sheetToJson(ws: ExcelJS.Worksheet): Record<string, unknown>[] {
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
        headers[col] = String(cell.value ?? "").trim();
    });

    const out: Record<string, unknown>[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const obj: Record<string, unknown> = {};
        let any = false;
        for (let c = 1; c < headers.length; c++) {
            const key = headers[c];
            if (!key) continue;
            const raw = row.getCell(c).value;
            let flat: unknown = raw;
            if (raw && typeof raw === "object") {
                if (raw instanceof Date) {
                    flat = raw.toISOString().slice(0, 10);
                } else if ("richText" in raw) {
                    flat = (raw as { richText: { text: string }[] }).richText
                        .map((t) => t.text)
                        .join("");
                } else if ("result" in raw) {
                    flat = (raw as { result: unknown }).result;
                } else if ("text" in raw) {
                    flat = (raw as { text: string }).text;
                }
            }
            if (flat === undefined || flat === "") flat = null;
            obj[key] = flat;
            if (flat !== null) any = true;
        }
        if (any) out.push(obj);
    }
    return out;
}

async function resolveAuthorIds(
    names: string[],
    startPosition: number,
    role: "author" | "editor"
): Promise<ContributorInput[]> {
    const out: ContributorInput[] = [];
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        let author = await findAuthorByNameCaseInsensitive(name);
        if (!author) {
            author = await createAuthor({ name });
        }
        out.push({
            author_id: author.id,
            role,
            position: startPosition + i,
        });
    }
    return out;
}

export async function POST(request: NextRequest) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return NextResponse.json({ error: "Empty workbook" }, { status: 400 });
        }
        const rows = sheetToJson(worksheet);

        let imported = 0;
        const skipped: { row: number; reason: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const rowIndex = i + 2; // 1-based, row 1 is header
            const row = rows[i];

            // Map Excel columns → CreateWorkInput fields
            const excel: Partial<CreateWorkInput> = {};
            for (const [header, field] of Object.entries(COLUMN_MAP)) {
                const val = row[header];
                if (val !== null && val !== undefined && val !== "") {
                    if (field === "number_of_pages") {
                        const n = parseInt(String(val), 10);
                        if (!isNaN(n)) excel[field] = n;
                    } else {
                        (excel as Record<string, unknown>)[field] = String(val);
                    }
                }
            }

            const excelAuthors = splitNames(row["Authors"]);
            const excelEditors = splitNames(row["Editor"]);

            let merged: Partial<CreateWorkInput> = { ...excel };
            let existingId: string | null = null;
            let autofillAuthors: string[] = [];

            // Try ISBN autofill (isbn_10 takes priority as lookup key)
            const rawIsbn = (excel.isbn_10 ?? excel.isbn_13) as string | undefined;
            if (rawIsbn) {
                const isbn = sanitizeISBN(rawIsbn);
                if (isValidISBN(isbn)) {
                    try {
                        const autofill = await lookupByISBN(isbn);
                        // Merge: autofill > excel for any non-null autofill values
                        merged = {
                            ...excel,
                            ...(autofill.title ? { title: autofill.title } : {}),
                            ...(autofill.publisher ? { publisher: autofill.publisher } : {}),
                            ...(autofill.date_published
                                ? { date_published: autofill.date_published }
                                : {}),
                            ...(autofill.isbn_10 ? { isbn_10: autofill.isbn_10 } : {}),
                            ...(autofill.isbn_13 ? { isbn_13: autofill.isbn_13 } : {}),
                            ...(autofill.lccn ? { lccn: autofill.lccn } : {}),
                            ...(autofill.number_of_pages
                                ? { number_of_pages: autofill.number_of_pages }
                                : {}),
                            ...(autofill.language ? { language: autofill.language } : {}),
                            ...(autofill.media_type ? { media_type: autofill.media_type } : {}),
                            ...(autofill.call_number ? { call_number: autofill.call_number } : {}),
                        };
                        autofillAuthors = autofill.authors ?? [];
                    } catch {
                        // Autofill failed — proceed with Excel data only
                    }

                    existingId = await findWorkByISBN(
                        merged.isbn_10 ?? null,
                        merged.isbn_13 ?? null
                    );
                }
            }

            if (!merged.title || merged.title === "Required") {
                skipped.push({ row: rowIndex, reason: "missing title" });
                continue;
            }

            // Authors precedence: autofill > Excel Authors column
            const authorNames = autofillAuthors.length > 0 ? autofillAuthors : excelAuthors;

            try {
                const authorContribs = await resolveAuthorIds(authorNames, 0, "author");
                const editorContribs = await resolveAuthorIds(
                    excelEditors,
                    authorContribs.length,
                    "editor"
                );
                const contributors = [...authorContribs, ...editorContribs];

                await upsertWork(
                    { ...(merged as CreateWorkInput), contributors },
                    existingId
                );
                imported++;
            } catch (err) {
                skipped.push({
                    row: rowIndex,
                    reason: err instanceof Error ? err.message : "unknown error",
                });
            }
        }

        return NextResponse.json({ imported, skipped });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
