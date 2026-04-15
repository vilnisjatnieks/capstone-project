const ExcelJS = require("exceljs");
const path = require("path");

const HEADERS = [
    "Title",
    "Date Published",
    "Publisher",
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

function blank() {
    const o = {};
    for (const h of HEADERS) o[h] = "";
    return o;
}

async function writeBook(name, rows) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Template");
    ws.columns = HEADERS.map((h) => ({ header: h, key: h }));
    ws.addRows(rows);
    const out = path.join(__dirname, "..", name);
    await wb.xlsx.writeFile(out);
    console.log("wrote", out);
}

// ---- File 1: matches PR #46 test plan exactly ----
// Row 2: valid ISBN-13 (Cormen CLRS 3rd ed) → autofill + insert
// Row 3: no ISBN, title filled → insert as-is
// Row 4: title blank → skipped ("row 4 — missing title")
// Expected toast: "2 imported, 1 skipped (row 4 — missing title)"
const primary = [
    {
        ...blank(),
        "Title": "Placeholder — will be overwritten by autofill",
        "Publisher": "Placeholder Press",
        "ISBN-13": "9780262033848",
        "Media Type": "book",
        "Language": "en",
        "Location": "Main Stacks",
        "Call Number": "QA76.6 .C662 2009",
    },
    {
        ...blank(),
        "Title": "Unpublished Karson Field Notes",
        "Publisher": "Karson Institute",
        "Date Published": "2024",
        "Editor": "J. Karson",
        "Media Type": "other",
        "Number of Pages": "42",
        "Language": "en",
        "Location": "Archive Room",
        "Call Number": "KAR-2024-01",
    },
    {
        ...blank(),
        "Title": "",
        "Publisher": "Orphan Publisher",
        "Media Type": "book",
    },
];

// ---- File 2: edge cases ----
const edge = [
    {
        ...blank(),
        "Title": "Required",
        "ISBN-10": "Used for autofill & upsert",
        "ISBN-13": "Used for autofill & upsert",
        "Media Type": "book | ebook | audiobook | periodical | dvd | other",
        "Number of Pages": "Integer",
    },
    {
        ...blank(),
        "Title": "Ignored — autofill wins",
        "ISBN-10": "0262033844",
        "Media Type": "book",
    },
    {
        ...blank(),
        "Title": "Bad ISBN Book",
        "ISBN-13": "1234567890123",
        "Publisher": "No Autofill Co",
        "Media Type": "book",
    },
    {
        ...blank(),
        "Title": "Pages NaN Book",
        "Publisher": "Garbage Numbers Press",
        "Number of Pages": "about three hundred",
        "Media Type": "book",
    },
    {
        ...blank(),
        "Title": "Weird Media Type",
        "Publisher": "Edge Press",
        "Media Type": "hologram",
    },
    {
        ...blank(),
        "Title": "   ",
        "Publisher": "Whitespace Only",
        "Media Type": "book",
    },
    {
        ...blank(),
        "Title": "Dashed ISBN Book",
        "ISBN-13": "978-0-262-03384-8",
        "Media Type": "book",
    },
];

(async () => {
    await writeBook("works-import-test.xlsx", primary);
    await writeBook("works-import-edge-cases.xlsx", edge);
})();
