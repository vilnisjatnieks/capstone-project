import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { requireStaff } from "@/lib/staff";
import { getAllWorks } from "@/lib/data/works";

export async function GET() {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    try {
        const works = await getAllWorks();

        const rows = works.map((w) => ({
            "Title": w.title,
            "Date Published": w.date_published ?? "",
            "Publisher": w.publisher ?? "",
            "Editor": w.editor ?? "",
            "LCCN": w.lccn ?? "",
            "ISBN-10": w.isbn_10 ?? "",
            "ISBN-13": w.isbn_13 ?? "",
            "Media Type": w.media_type ?? "",
            "Number of Pages": w.number_of_pages ?? "",
            "Language": w.language ?? "",
            "Location": w.location ?? "",
            "Call Number": w.call_number ?? "",
        }));

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Works");

        const buffer: Buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(new Uint8Array(buffer), {
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
