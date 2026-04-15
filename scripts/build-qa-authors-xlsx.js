const ExcelJS = require("exceljs");
const path = require("path");

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

async function write(filename, rows) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Works");
    ws.columns = HEADERS.map((h) => ({ header: h, key: h }));
    ws.addRows(rows);
    const out = path.resolve(__dirname, "..", filename);
    await wb.xlsx.writeFile(out);
    console.log("wrote", out);
}

(async () => {
    await write("qa-authors-import.xlsx", [
        {
            Title: "QA Autofill Test",
            Authors: "Fake Author; Another Fake",
            "ISBN-13": "9780061120084",
        },
        {
            Title: "QA Excel Fallback",
            Authors: "Jane Doe; John Smith",
        },
    ]);

    await write("qa-authors-import-dedupe.xlsx", [
        {
            Title: "QA Dedupe Test",
            Authors: "jane doe; JOHN smith",
        },
    ]);
})();
