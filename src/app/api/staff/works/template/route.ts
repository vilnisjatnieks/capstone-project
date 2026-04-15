import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");
    worksheet.columns = HEADERS.map((h) => ({ header: h, key: h }));
    worksheet.addRow(hint);

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="works-import-template.xlsx"',
        },
    });
}
