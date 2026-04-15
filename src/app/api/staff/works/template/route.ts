import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { requireStaff } from "@/lib/staff";

const HEADERS = [
    "Title",
    "Date Published",
    "Publisher",
    "Authors",
    "Editor",
    "LCCN",
    "ISBN-10",
    "ISBN-13",
    "Media Type",
    "Number of Pages",
    "Language",
    "Location",
    "Call Number",
];

export async function GET() {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const hint: Record<string, string> = {
        "Title": "Required",
        "Date Published": "",
        "Publisher": "",
        "Authors": "Semicolon-separated, e.g. Jane Smith; John Doe",
        "Editor": "Semicolon-separated",
        "LCCN": "",
        "ISBN-10": "Used for autofill & upsert",
        "ISBN-13": "Used for autofill & upsert",
        "Media Type": "book | ebook | audiobook | periodical | dvd | other",
        "Number of Pages": "Integer",
        "Language": "",
        "Location": "",
        "Call Number": "",
    };

    const rows = [hint];
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows, { header: HEADERS });
    xlsx.utils.book_append_sheet(workbook, worksheet, "Template");

    const buffer: Buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="works-import-template.xlsx"',
        },
    });
}
