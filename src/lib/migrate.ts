import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Read migration files
    const migrationsDir = join(__dirname, "migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      // Check if migration already ran
      const existing = await pool.query(
        "SELECT id FROM migrations WHERE name = $1",
        [file]
      );

      if (existing.rows.length > 0) {
        console.log(`Skipping ${file} (already executed)`);
        continue;
      }

      // Execute migration
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      console.log(`Running ${file}...`);
      await pool.query(sql);

      // Record migration
      await pool.query("INSERT INTO migrations (name) VALUES ($1)", [file]);
      console.log(`Completed ${file}`);
    }

    // Seed admin user if not exists
    const adminExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      ["admin@example.com"]
    );

    if (adminExists.rows.length === 0) {
      const passwordHash = await hashPassword("admin123");
      await pool.query(
        "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)",
        ["admin@example.com", passwordHash, "Admin", "admin"]
      );
      console.log("Seeded admin user (admin@example.com / admin123)");
    } else {
      console.log("Admin user already exists, skipping seed");
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
