import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface WorkAuthorDTO {
    id: string;
    name: string;
    sort_name: string | null;
    role: string;
    position: number;
}

export interface WorkDTO {
    id: string;
    title: string;
    date_published: string | null;
    publisher: string | null;
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
    authors: WorkAuthorDTO[];
}

export interface WorkWithCoverDTO extends WorkDTO {
    cover: string | null;
}

export interface ContributorInput {
    author_id: string;
    role: string;
    position: number;
}

export interface CreateWorkInput {
    title: string;
    date_published?: string | null;
    publisher?: string | null;
    cover?: string | null; // base64-encoded
    lccn?: string | null;
    isbn_10?: string | null;
    isbn_13?: string | null;
    media_type?: string | null;
    number_of_pages?: number | null;
    language?: string | null;
    location?: string | null;
    call_number?: string | null;
    contributors?: ContributorInput[];
}

export interface UpdateWorkInput {
    title?: string;
    date_published?: string | null;
    publisher?: string | null;
    cover?: string | null; // base64-encoded
    lccn?: string | null;
    isbn_10?: string | null;
    isbn_13?: string | null;
    media_type?: string | null;
    number_of_pages?: number | null;
    language?: string | null;
    location?: string | null;
    call_number?: string | null;
    contributors?: ContributorInput[];
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

async function attachAuthorsToWorks<T extends { id: string }>(
    works: T[]
): Promise<(T & { authors: WorkAuthorDTO[] })[]> {
    if (works.length === 0) return [];
    const ids = works.map((w) => w.id);
    const result = await query(
        `SELECT wa.work_id, a.id, a.name, a.sort_name, wa.role, wa.position
         FROM work_authors wa
         JOIN authors a ON a.id = wa.author_id
         WHERE wa.work_id = ANY($1::uuid[])
         ORDER BY wa.position ASC`,
        [ids]
    );
    const byWork = new Map<string, WorkAuthorDTO[]>();
    for (const row of result.rows as Array<{
        work_id: string;
        id: string;
        name: string;
        sort_name: string | null;
        role: string;
        position: number;
    }>) {
        const list = byWork.get(row.work_id) ?? [];
        list.push({
            id: row.id,
            name: row.name,
            sort_name: row.sort_name,
            role: row.role,
            position: row.position,
        });
        byWork.set(row.work_id, list);
    }
    return works.map((w) => ({ ...w, authors: byWork.get(w.id) ?? [] }));
}

async function replaceContributors(
    workId: string,
    contributors: ContributorInput[]
): Promise<void> {
    await query(`DELETE FROM work_authors WHERE work_id = $1`, [workId]);
    if (contributors.length === 0) return;
    const values: unknown[] = [];
    const placeholders: string[] = [];
    contributors.forEach((c, i) => {
        const base = i * 4;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
        values.push(workId, c.author_id, c.role, c.position);
    });
    await query(
        `INSERT INTO work_authors (work_id, author_id, role, position)
         VALUES ${placeholders.join(", ")}`,
        values
    );
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** List all works (staff only). Returns DTOs without cover data. */
export async function getAllWorks(): Promise<WorkDTO[]> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher,
                lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                location, call_number, updated_at
         FROM works ORDER BY created_at DESC`
    );

    return (await attachAuthorsToWorks(result.rows as WorkDTO[])) as WorkDTO[];
}

/** Get a single work by ID (staff only). Includes base64-encoded cover. */
export async function getWorkById(id: string): Promise<WorkWithCoverDTO | null> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher,
                encode(cover, 'base64') as cover,
                lccn, isbn_10, isbn_13, media_type, number_of_pages,
                language, location, call_number, updated_at
         FROM works WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) return null;
    const [withAuthors] = await attachAuthorsToWorks(result.rows as WorkWithCoverDTO[]);
    return withAuthors as WorkWithCoverDTO;
}

/** Get a single work by ID (public access). Includes base64-encoded cover. */
export async function getPublicWorkById(id: string): Promise<WorkWithCoverDTO | null> {
    const result = await query(
        `SELECT id, created_at, title, date_published, publisher,
                encode(cover, 'base64') as cover,
                lccn, isbn_10, isbn_13, media_type, number_of_pages,
                language, location, call_number, updated_at
         FROM works WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) return null;
    const [withAuthors] = await attachAuthorsToWorks(result.rows as WorkWithCoverDTO[]);
    return withAuthors as WorkWithCoverDTO;
}

/** Search works (public). Returns DTOs without cover data. */
export async function searchWorks(params: {
    q?: string;
    mediaType?: string;
    tagId?: string;
}): Promise<WorkDTO[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.q) {
        conditions.push(
            `(w.title ILIKE $${paramIndex}
              OR w.publisher ILIKE $${paramIndex}
              OR w.isbn_10 ILIKE $${paramIndex}
              OR w.isbn_13 ILIKE $${paramIndex}
              OR w.lccn ILIKE $${paramIndex}
              OR EXISTS (
                SELECT 1 FROM work_authors wa
                JOIN authors a ON a.id = wa.author_id
                WHERE wa.work_id = w.id AND a.name ILIKE $${paramIndex}
              ))`
        );
        values.push(`%${params.q}%`);
        paramIndex++;
    }

    if (params.mediaType) {
        conditions.push(`w.media_type = $${paramIndex}`);
        values.push(params.mediaType);
        paramIndex++;
    }

    let joinClause = "";
    if (params.tagId) {
        joinClause = `JOIN work_tags wt ON wt.work_id = w.id`;
        conditions.push(`wt.tag_id = $${paramIndex}`);
        values.push(params.tagId);
        paramIndex++;
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
        `SELECT w.id, w.title, w.date_published, w.publisher,
                w.lccn, w.isbn_10, w.isbn_13, w.media_type, w.number_of_pages,
                w.language, w.location, w.call_number,
                (w.cover IS NOT NULL) as has_cover,
                updated_at
         FROM works w ${joinClause} ${whereClause}
         ORDER BY w.title ASC`,
        values.length > 0 ? values : undefined
    );

    return (await attachAuthorsToWorks(
        result.rows as (WorkDTO & { has_cover: boolean })[]
    )) as (WorkDTO & { has_cover: boolean })[];
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Create a new work (staff only). */
export async function createWork(input: CreateWorkInput): Promise<WorkDTO> {
    await requireStaffUser();

    const coverBuffer = input.cover ? Buffer.from(input.cover, "base64") : null;

    const result = await query(
        `INSERT INTO works (title, date_published, publisher, cover,
                        lccn, isbn_10, isbn_13, media_type, number_of_pages,
                        language, location, call_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, created_at, title, date_published, publisher,
                   lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                   location, call_number, updated_at`,
        [
            input.title,
            input.date_published || null,
            input.publisher || null,
            coverBuffer,
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

    const work = result.rows[0] as WorkDTO;

    if (input.contributors && input.contributors.length > 0) {
        await replaceContributors(work.id, input.contributors);
    }

    const [withAuthors] = await attachAuthorsToWorks([work]);
    return withAuthors;
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

    const hasContributorsUpdate = input.contributors !== undefined;

    if (fields.length === 0 && !hasContributorsUpdate) {
        throw new Error("At least one field is required");
    }

    let work: WorkDTO | null = null;

    if (fields.length > 0) {
        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await query(
            `UPDATE works SET ${fields.join(", ")} WHERE id = $${paramIndex}
             RETURNING id, created_at, title, date_published, publisher,
                       lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                       location, call_number, updated_at`,
            values
        );

        if (result.rows.length === 0) return null;
        work = result.rows[0] as WorkDTO;
    } else {
        const existing = await query(
            `SELECT id, created_at, title, date_published, publisher,
                    lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                    location, call_number, updated_at
             FROM works WHERE id = $1`,
            [id]
        );
        if (existing.rows.length === 0) return null;
        work = existing.rows[0] as WorkDTO;
    }

    if (hasContributorsUpdate) {
        await replaceContributors(id, input.contributors ?? []);
    }

    const [withAuthors] = await attachAuthorsToWorks([work]);
    return withAuthors;
}

/** Find a work by ISBN-10 or ISBN-13 (staff only). Returns the work id or null. */
export async function findWorkByISBN(
    isbn10: string | null,
    isbn13: string | null
): Promise<string | null> {
    await requireStaffUser();

    if (!isbn10 && !isbn13) return null;

    const conditions: string[] = [];
    const values: string[] = [];
    let idx = 1;

    if (isbn10) {
        conditions.push(`isbn_10 = $${idx++}`);
        values.push(isbn10);
    }
    if (isbn13) {
        conditions.push(`isbn_13 = $${idx++}`);
        values.push(isbn13);
    }

    const result = await query(
        `SELECT id FROM works WHERE ${conditions.join(" OR ")} LIMIT 1`,
        values
    );

    return result.rows.length > 0 ? (result.rows[0].id as string) : null;
}

/** Upsert a work (staff only). Updates if existingId given, otherwise creates. */
export async function upsertWork(
    input: CreateWorkInput,
    existingId: string | null
): Promise<{ work: WorkDTO; action: "created" | "updated" }> {
    if (existingId) {
        const work = await updateWork(existingId, input);
        if (!work) throw new Error(`Work ${existingId} not found`);
        return { work, action: "updated" };
    }
    const work = await createWork(input);
    return { work, action: "created" };
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
