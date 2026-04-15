import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface AuthorDTO {
    id: string;
    name: string;
    sort_name: string | null;
    created_at: string;
}

export interface AuthorWithWorksDTO extends AuthorDTO {
    works: {
        id: string;
        title: string;
        date_published: string | null;
        publisher: string | null;
        role: string;
    }[];
}

export interface CreateAuthorInput {
    name: string;
    sort_name?: string | null;
}

export interface UpdateAuthorInput {
    name?: string;
    sort_name?: string | null;
}

async function requireStaffUser() {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    if (user.role !== "admin" && user.role !== "staff") {
        throw new Error("Forbidden");
    }
    return user;
}

export async function createAuthor(input: CreateAuthorInput): Promise<AuthorDTO> {
    await requireStaffUser();
    if (!input.name || !input.name.trim()) {
        throw new Error("Name is required");
    }
    const result = await query(
        `INSERT INTO authors (name, sort_name)
         VALUES ($1, $2)
         RETURNING id, name, sort_name, created_at`,
        [input.name.trim(), input.sort_name ?? null]
    );
    return result.rows[0] as AuthorDTO;
}

export async function getAuthorById(id: string): Promise<AuthorDTO | null> {
    const result = await query(
        `SELECT id, name, sort_name, created_at FROM authors WHERE id = $1`,
        [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as AuthorDTO;
}

export async function getAuthorWithWorks(
    id: string
): Promise<AuthorWithWorksDTO | null> {
    const authorResult = await query(
        `SELECT id, name, sort_name, created_at FROM authors WHERE id = $1`,
        [id]
    );
    if (authorResult.rows.length === 0) return null;
    const author = authorResult.rows[0] as AuthorDTO;

    const worksResult = await query(
        `SELECT w.id, w.title, w.date_published, w.publisher, wa.role
         FROM work_authors wa
         JOIN works w ON w.id = wa.work_id
         WHERE wa.author_id = $1
         ORDER BY wa.role ASC, w.title ASC`,
        [id]
    );

    return { ...author, works: worksResult.rows as AuthorWithWorksDTO["works"] };
}

export async function updateAuthor(
    id: string,
    input: UpdateAuthorInput
): Promise<AuthorDTO | null> {
    await requireStaffUser();

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
        if (!input.name.trim()) throw new Error("Name cannot be empty");
        fields.push(`name = $${idx++}`);
        values.push(input.name.trim());
    }
    if (input.sort_name !== undefined) {
        fields.push(`sort_name = $${idx++}`);
        values.push(input.sort_name);
    }
    if (fields.length === 0) {
        throw new Error("At least one field is required");
    }

    values.push(id);
    const result = await query(
        `UPDATE authors SET ${fields.join(", ")} WHERE id = $${idx}
         RETURNING id, name, sort_name, created_at`,
        values
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as AuthorDTO;
}

export async function searchAuthors(q: string): Promise<AuthorDTO[]> {
    await requireStaffUser();
    const like = `%${q.trim()}%`;
    const result = await query(
        `SELECT id, name, sort_name, created_at FROM authors
         WHERE name ILIKE $1 OR sort_name ILIKE $1
         ORDER BY name ASC LIMIT 20`,
        [like]
    );
    return result.rows as AuthorDTO[];
}

export async function findAuthorByNameCaseInsensitive(
    name: string
): Promise<AuthorDTO | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const result = await query(
        `SELECT id, name, sort_name, created_at FROM authors
         WHERE lower(name) = lower($1) LIMIT 1`,
        [trimmed]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as AuthorDTO;
}

export async function deleteAuthor(id: string): Promise<boolean> {
    await requireStaffUser();
    try {
        const result = await query(
            `DELETE FROM authors WHERE id = $1 RETURNING id`,
            [id]
        );
        return result.rows.length > 0;
    } catch (err) {
        if (err instanceof Error && /foreign key|violates/i.test(err.message)) {
            throw new Error("Author has attached works");
        }
        throw err;
    }
}
