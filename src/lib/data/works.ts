import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface WorkDTO {
    id: string;
    title: string;
    date_published: string | null;
    publisher: string | null;
    editor: string | null;
    lccn: string | null;
    isbn_10: string | null;
    isbn_13: string | null;
    media_type: string | null;
    number_of_pages: number | null;
    language: string | null;
    location: string | null;
    call_number: string | null;
    created_at: string;
    updated_at: string;
}

export interface WorkWithCoverDTO extends WorkDTO {
    cover: string | null;
}

export interface CreateWorkInput {
    title: string;
    date_published?: string | null;
    publisher?: string | null;
    cover?: string | null; // base64-encoded
    editor?: string | null;
    lccn?: string | null;
    isbn_10?: string | null;
    isbn_13?: string | null;
    media_type?: string | null;
    number_of_pages?: number | null;
    language?: string | null;
    location?: string | null;
    call_number?: string | null;
}

export interface UpdateWorkInput {
    title?: string;
    date_published?: string | null;
    publisher?: string | null;
    cover?: string | null; // base64-encoded
    editor?: string | null;
    lccn?: string | null;
    isbn_10?: string | null;
    isbn_13?: string | null;
    media_type?: string | null;
    number_of_pages?: number | null;
    language?: string | null;
    location?: string | null;
    call_number?: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function requireStaffUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (user.role !== "admin" && user.role !== "staff") {
        throw new Error("Forbidden");
    }
    return user;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** List all works (staff only). Returns DTOs without cover data. */
export async function getAllWorks(): Promise<WorkDTO[]> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher, editor,
                lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                location, call_number, updated_at
         FROM works ORDER BY created_at DESC`
    );

    return result.rows as WorkDTO[];
}

/** Get a single work by ID (staff only). Includes base64-encoded cover. */
export async function getWorkById(id: string): Promise<WorkWithCoverDTO | null> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher,
                encode(cover, 'base64') as cover,
                editor, lccn, isbn_10, isbn_13, media_type, number_of_pages,
                language, location, call_number, updated_at
         FROM works WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkWithCoverDTO;
}

/** Get a single work by ID (public access). Includes base64-encoded cover. */
export async function getPublicWorkById(id: string): Promise<WorkWithCoverDTO | null> {
    const result = await query(
        `SELECT id, created_at, title, date_published, publisher,
                encode(cover, 'base64') as cover,
                editor, lccn, isbn_10, isbn_13, media_type, number_of_pages,
                language, location, call_number, updated_at
         FROM works WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkWithCoverDTO;
}

/** Search works (public). Returns DTOs without cover data. */
export async function searchWorks(params: {
    q?: string;
    mediaType?: string;
}): Promise<WorkDTO[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.q) {
        conditions.push(
            `(title ILIKE $${paramIndex}
              OR publisher ILIKE $${paramIndex}
              OR editor ILIKE $${paramIndex}
              OR isbn_10 ILIKE $${paramIndex}
              OR isbn_13 ILIKE $${paramIndex}
              OR lccn ILIKE $${paramIndex})`
        );
        values.push(`%${params.q}%`);
        paramIndex++;
    }

    if (params.mediaType) {
        conditions.push(`media_type = $${paramIndex}`);
        values.push(params.mediaType);
        paramIndex++;
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
        `SELECT id, title, date_published, publisher, editor,
                lccn, isbn_10, isbn_13, media_type, number_of_pages,
                language, location, call_number,
                (cover IS NOT NULL) as has_cover
         FROM works ${whereClause}
         ORDER BY title ASC`,
        values.length > 0 ? values : undefined
    );

    return result.rows as (WorkDTO & { has_cover: boolean })[];
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Create a new work (staff only). */
export async function createWork(input: CreateWorkInput): Promise<WorkDTO> {
    await requireStaffUser();

    const coverBuffer = input.cover ? Buffer.from(input.cover, "base64") : null;

    const result = await query(
        `INSERT INTO works (title, date_published, publisher, cover, editor,
                        lccn, isbn_10, isbn_13, media_type, number_of_pages,
                        language, location, call_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, created_at, title, date_published, publisher, editor,
                   lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                   location, call_number, updated_at`,
        [
            input.title,
            input.date_published || null,
            input.publisher || null,
            coverBuffer,
            input.editor || null,
            input.lccn || null,
            input.isbn_10 || null,
            input.isbn_13 || null,
            input.media_type || null,
            input.number_of_pages || null,
            input.language || null,
            input.location || null,
            input.call_number || null,
        ]
    );

    return result.rows[0] as WorkDTO;
}

/** Update an existing work (staff only). */
export async function updateWork(
    id: string,
    input: UpdateWorkInput
): Promise<WorkDTO | null> {
    await requireStaffUser();

    const updatableFields: Record<string, unknown> = {
        title: input.title,
        date_published: input.date_published,
        publisher: input.publisher,
        editor: input.editor,
        lccn: input.lccn,
        isbn_10: input.isbn_10,
        isbn_13: input.isbn_13,
        media_type: input.media_type,
        number_of_pages: input.number_of_pages,
        language: input.language,
        location: input.location,
        call_number: input.call_number,
    };

    // Handle cover separately since it needs base64 decoding
    if (input.cover !== undefined) {
        updatableFields.cover = input.cover
            ? Buffer.from(input.cover, "base64")
            : null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updatableFields)) {
        if (value !== undefined) {
            fields.push(`${key} = $${paramIndex++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        throw new Error("At least one field is required");
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
        `UPDATE works SET ${fields.join(", ")} WHERE id = $${paramIndex}
         RETURNING id, created_at, title, date_published, publisher, editor,
                   lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                   location, call_number, updated_at`,
        values
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkDTO;
}

/** Delete a work (staff only). Returns true if deleted, false if not found. */
export async function deleteWork(id: string): Promise<boolean> {
    await requireStaffUser();

    const result = await query(
        "DELETE FROM works WHERE id = $1 RETURNING id",
        [id]
    );

    return result.rows.length > 0;
}
