import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireStaff } from "@/lib/staff";
import { getAllWorks } from "@/lib/data/works";

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

    try {
        const works = await getAllWorks();

        const rows = works.map((w) => ({
            "Title": w.title,
            "Date Published": w.date_published ?? "",
            "Publisher": w.publisher ?? "",
            "Authors": w.authors
                .filter((a) => a.role === "author")
                .sort((a, b) => a.position - b.position)
                .map((a) => a.name)
                .join("; "),
            "Editor": w.authors
                .filter((a) => a.role === "editor")
                .sort((a, b) => a.position - b.position)
                .map((a) => a.name)
                .join("; "),
            "LCCN": w.lccn ?? "",
            "ISBN-10": w.isbn_10 ?? "",
            "ISBN-13": w.isbn_13 ?? "",
            "Media Type": w.media_type ?? "",
            "Number of Pages": w.number_of_pages ?? "",
            "Language": w.language ?? "",
            "Location": w.location ?? "",
            "Call Number": w.call_number ?? "",
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Works");
        worksheet.columns = HEADERS.map((h) => ({ header: h, key: h }));
        worksheet.addRows(rows);

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": 'attachment; filename="works-export.xlsx"',
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
