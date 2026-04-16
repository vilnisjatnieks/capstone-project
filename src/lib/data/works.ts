import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { PaginationParams } from "@/lib/pagination";

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
         WHERE wa.work_id = ANY($1::bigint[])
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

/** List all works (staff only), paginated. Returns DTOs without cover data. */
export async function getAllWorks(
    params: PaginationParams
): Promise<{ rows: WorkDTO[]; total: number }> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher,
                lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                location, call_number, updated_at,
                COUNT(*) OVER() AS total_count
         FROM works ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [params.pageSize, params.offset]
    );

    const total = Number(result.rows[0]?.total_count ?? 0);
    const rows = result.rows.map((r: Record<string, unknown>) => {
        const { total_count: _ignored, ...rest } = r;
        return rest;
    }) as unknown as WorkDTO[];

    return {
        rows: (await attachAuthorsToWorks(rows)) as WorkDTO[],
        total,
    };
}

/** List all works without pagination (staff only). Used for bulk export. */
export async function getAllWorksForExport(): Promise<WorkDTO[]> {
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

export type SearchSortField =
    | "title"
    | "call_number"
    | "date_published"
    | "media_type"
    | "number_of_pages";

const SEARCH_SORT_COLUMNS: Record<SearchSortField, string> = {
    title: "w.title",
    call_number: "w.call_number",
    date_published: "w.date_published",
    media_type: "w.media_type",
    number_of_pages: "w.number_of_pages",
};

export interface SearchWorksFilters {
    q?: string;
    mediaType?: string;
    tagId?: string;
    language?: string;
    sort?: SearchSortField;
    dir?: "asc" | "desc";
}

/** Search works (public), paginated with optional sort + language filter. */
export async function searchWorks(
    filters: SearchWorksFilters,
    pagination: PaginationParams
): Promise<{
    rows: (WorkDTO & { has_cover: boolean })[];
    total: number;
    languages: string[];
}> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.q) {
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
        values.push(`%${filters.q}%`);
        paramIndex++;
    }

    if (filters.mediaType) {
        conditions.push(`w.media_type = $${paramIndex}`);
        values.push(filters.mediaType);
        paramIndex++;
    }

    let joinClause = "";
    if (filters.tagId) {
        joinClause = `JOIN work_tags wt ON wt.work_id = w.id`;
        conditions.push(`wt.tag_id = $${paramIndex}`);
        values.push(filters.tagId);
        paramIndex++;
    }

    // language filter applies to paginated query only (not to distinct-languages query)
    const preLangConditions = [...conditions];
    const preLangValues = [...values];

    if (filters.language) {
        conditions.push(`w.language = $${paramIndex}`);
        values.push(filters.language);
        paramIndex++;
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sortCol = SEARCH_SORT_COLUMNS[filters.sort ?? "title"] ?? "w.title";
    const sortDir = filters.dir === "desc" ? "DESC" : "ASC";
    const orderBy = `ORDER BY ${sortCol} ${sortDir} NULLS LAST, w.id ASC`;

    const paginatedValues = [...values, pagination.pageSize, pagination.offset];

    const result = await query(
        `SELECT w.id, w.title, w.date_published, w.publisher,
                w.lccn, w.isbn_10, w.isbn_13, w.media_type, w.number_of_pages,
                w.language, w.location, w.call_number,
                (w.cover IS NOT NULL) as has_cover,
                updated_at,
                COUNT(*) OVER() AS total_count
         FROM works w ${joinClause} ${whereClause}
         ${orderBy}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        paginatedValues
    );

    const total = Number(result.rows[0]?.total_count ?? 0);
    const rawRows = result.rows.map((r: Record<string, unknown>) => {
        const { total_count: _ignored, ...rest } = r;
        return rest;
    }) as unknown as (WorkDTO & { has_cover: boolean })[];

    const rows = (await attachAuthorsToWorks(rawRows)) as (WorkDTO & {
        has_cover: boolean;
    })[];

    // Distinct languages for the same filter set (ignoring language filter itself)
    const preLangWhere =
        preLangConditions.length > 0
            ? `WHERE ${preLangConditions.join(" AND ")} AND w.language IS NOT NULL`
            : `WHERE w.language IS NOT NULL`;
    const langResult = await query(
        `SELECT DISTINCT w.language
         FROM works w ${joinClause} ${preLangWhere}
         ORDER BY w.language ASC`,
        preLangValues.length > 0 ? preLangValues : undefined
    );
    const languages = langResult.rows.map((r: { language: string }) => r.language);

    return { rows, total, languages };
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
