import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface TagDTO {
    id: string;
    name: string;
    color: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateTagInput {
    name: string;
    color?: string | null;
}

export interface UpdateTagInput {
    name?: string;
    color?: string | null;
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

/** List all tags ordered by name (staff only). */
export async function getAllTags(): Promise<TagDTO[]> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, name, color, created_at, updated_at
         FROM tags ORDER BY name ASC`
    );

    return result.rows as TagDTO[];
}

/** Get a single tag by ID (staff only). */
export async function getTagById(id: string): Promise<TagDTO | null> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, name, color, created_at, updated_at
         FROM tags WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as TagDTO;
}

/** List all tags ordered by name (public access). */
export async function getPublicTags(): Promise<TagDTO[]> {
    const result = await query(
        `SELECT id, name, color, created_at, updated_at
         FROM tags ORDER BY name ASC`
    );

    return result.rows as TagDTO[];
}

/** Get tags for a work (public access). */
export async function getTagsForWork(workId: string): Promise<TagDTO[]> {
    const result = await query(
        `SELECT t.id, t.name, t.color, t.created_at, t.updated_at
         FROM tags t
         JOIN work_tags wt ON wt.tag_id = t.id
         WHERE wt.work_id = $1
         ORDER BY t.name ASC`,
        [workId]
    );

    return result.rows as TagDTO[];
}

/** Get tags for multiple works in one query (public access). */
export async function getTagsForWorks(
    workIds: string[]
): Promise<Record<string, TagDTO[]>> {
    if (workIds.length === 0) return {};

    const placeholders = workIds.map((_, i) => `$${i + 1}`).join(", ");
    const result = await query(
        `SELECT wt.work_id, t.id, t.name, t.color, t.created_at, t.updated_at
         FROM tags t
         JOIN work_tags wt ON wt.tag_id = t.id
         WHERE wt.work_id IN (${placeholders})
         ORDER BY t.name ASC`,
        workIds
    );

    const map: Record<string, TagDTO[]> = {};
    for (const row of result.rows) {
        const wid = String(row.work_id);
        if (!map[wid]) map[wid] = [];
        map[wid].push({
            id: row.id,
            name: row.name,
            color: row.color,
            created_at: row.created_at,
            updated_at: row.updated_at,
        });
    }
    return map;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Create a new tag (staff only). */
export async function createTag(input: CreateTagInput): Promise<TagDTO> {
    await requireStaffUser();

    try {
        const result = await query(
            `INSERT INTO tags (name, color)
             VALUES ($1, $2)
             RETURNING id, name, color, created_at, updated_at`,
            [input.name, input.color || null]
        );

        return result.rows[0] as TagDTO;
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code: string }).code === "23505"
        ) {
            throw new Error("Tag name already exists");
        }
        throw error;
    }
}

/** Update an existing tag (staff only). */
export async function updateTag(
    id: string,
    input: UpdateTagInput
): Promise<TagDTO | null> {
    await requireStaffUser();

    const updatableFields: Record<string, unknown> = {
        name: input.name,
        color: input.color,
    };

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

    try {
        const result = await query(
            `UPDATE tags SET ${fields.join(", ")} WHERE id = $${paramIndex}
             RETURNING id, name, color, created_at, updated_at`,
            values
        );

        if (result.rows.length === 0) return null;
        return result.rows[0] as TagDTO;
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code: string }).code === "23505"
        ) {
            throw new Error("Tag name already exists");
        }
        throw error;
    }
}

/** Delete a tag (staff only). Returns true if deleted, false if not found. */
export async function deleteTag(id: string): Promise<boolean> {
    await requireStaffUser();

    const result = await query(
        "DELETE FROM tags WHERE id = $1 RETURNING id",
        [id]
    );

    return result.rows.length > 0;
}

/** Add a tag to a work (staff only). */
export async function addTagToWork(
    workId: string,
    tagId: string
): Promise<void> {
    await requireStaffUser();

    await query(
        `INSERT INTO work_tags (work_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [workId, tagId]
    );
}

/** Remove a tag from a work (staff only). Returns true if removed. */
export async function removeTagFromWork(
    workId: string,
    tagId: string
): Promise<boolean> {
    await requireStaffUser();

    const result = await query(
        "DELETE FROM work_tags WHERE work_id = $1 AND tag_id = $2 RETURNING work_id",
        [workId, tagId]
    );

    return result.rows.length > 0;
}
