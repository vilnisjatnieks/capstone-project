import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
    const secret = process.env.CRON_SECRET;
    console.log("Using CRON_SECRET:", secret ? "Present" : "Missing");

    try {
        const res = await fetch("http://localhost:3000/api/cron/reminders", {
            headers: { Authorization: `Bearer ${secret}` },
        });
        const data = await res.json();
        console.log("Cron response:", data);
    } catch (e) {
        console.error("Error calling cron endpoint:", e);
    }
}
run();
