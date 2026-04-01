import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface UserListDTO {
    id: string;
    name: string;
    email: string;
}

export interface UserAdminDTO {
    id: string;
    email: string;
    name: string;
    role: "admin" | "staff" | "user";
    created_at: string;
    updated_at: string;
}

export interface CreateUserInput {
    email: string;
    name: string;
    password: string;
    role?: string;
}

export interface UpdateUserInput {
    email?: string;
    name?: string;
    role?: string;
    password?: string;
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

async function requireAdminUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (user.role !== "admin") {
        throw new Error("Forbidden");
    }
    return user;
}

// ---------------------------------------------------------------------------
// Unauthenticated helpers (used by auth flow)
// ---------------------------------------------------------------------------

export interface UserRow {
    id: string;
    email: string;
    name: string;
    role: string;
    password_hash: string;
    created_at: string;
    updated_at: string;
    email_verified_at?: string | null;
}

/** Find a user by email. Returns the full row (incl. password_hash) or null. */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
    const result = await query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as UserRow;
}

/** Register a new user (self-service). Returns the created user DTO. */
export async function registerUser(
    email: string,
    name: string,
    passwordHash: string
): Promise<{ id: string; email: string; name: string; role: string }> {
    const result = await query(
        "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, role",
        [email, name, passwordHash]
    );
    return result.rows[0];
}

// ---------------------------------------------------------------------------
// Read operations (staff)
// ---------------------------------------------------------------------------

/** List all staff and admin users (id + name) for internal notification use. */
export async function getStaffAndAdminUsers(): Promise<{ id: string; name: string }[]> {
    const result = await query(
        `SELECT id, name FROM users WHERE role IN ('staff', 'admin') ORDER BY name ASC`
    );

    return result.rows as { id: string; name: string }[];
}

/** List all users with minimal fields (staff only). */
export async function getAllUsers(): Promise<UserListDTO[]> {
    await requireStaffUser();

    const result = await query(
        `SELECT id, name, email FROM users ORDER BY name ASC`
    );

    return result.rows as UserListDTO[];
}

// ---------------------------------------------------------------------------
// Read operations (admin)
// ---------------------------------------------------------------------------

/** List all users with full admin fields (admin only). */
export async function getAdminAllUsers(): Promise<UserAdminDTO[]> {
    await requireAdminUser();

    const result = await query(
        "SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC"
    );

    return result.rows as UserAdminDTO[];
}

// ---------------------------------------------------------------------------
// Write operations (admin)
// ---------------------------------------------------------------------------

/** Create a new user (admin only). */
export async function createUser(input: CreateUserInput): Promise<UserAdminDTO> {
    await requireAdminUser();

    if (!input.email || !input.name || !input.password) {
        throw new Error("Email, name, and password are required");
    }

    // Check email uniqueness
    const existing = await query("SELECT id FROM users WHERE email = $1", [
        input.email,
    ]);
    if (existing.rows.length > 0) {
        throw new Error("Email already in use");
    }

    const passwordHash = await hashPassword(input.password);
    const userRole = input.role || "user";

    const result = await query(
        `INSERT INTO users (email, name, password_hash, role, email_verified_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, email, name, role, created_at, updated_at`,
        [input.email, input.name, passwordHash, userRole]
    );

    return result.rows[0] as UserAdminDTO;
}

/** Update an existing user (admin only). */
export async function updateUser(
    id: string,
    input: UpdateUserInput
): Promise<UserAdminDTO | null> {
    const currentUser = await requireAdminUser();

    if (!input.email && !input.name && !input.role && !input.password) {
        throw new Error("At least one field is required");
    }

    // Prevent admin from changing their own role
    if (input.role && id === currentUser.id) {
        throw new Error("Cannot change your own role");
    }

    // Check email uniqueness (excluding current user)
    if (input.email) {
        const existing = await query(
            "SELECT id FROM users WHERE email = $1 AND id != $2",
            [input.email, id]
        );
        if (existing.rows.length > 0) {
            throw new Error("Email already in use");
        }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.email) {
        fields.push(`email = $${paramIndex++}`);
        values.push(input.email);
    }
    if (input.name) {
        fields.push(`name = $${paramIndex++}`);
        values.push(input.name);
    }
    if (input.role) {
        fields.push(`role = $${paramIndex++}`);
        values.push(input.role);
    }
    if (input.password) {
        const passwordHash = await hashPassword(input.password);
        fields.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
        `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex}
         RETURNING id, email, name, role, created_at, updated_at`,
        values
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as UserAdminDTO;
}

/** Mark a user's email as verified. */
export async function markEmailVerified(userId: string): Promise<void> {
    await query(
        "UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1",
        [userId]
    );
}

/** Update a user's password hash. */
export async function updatePasswordHash(
    userId: string,
    passwordHash: string
): Promise<void> {
    await query(
        "UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1",
        [userId, passwordHash]
    );
}

/** Delete a user (admin only). Cannot delete yourself. */
export async function deleteUser(id: string): Promise<boolean> {
    const currentUser = await requireAdminUser();

    if (id === currentUser.id) {
        throw new Error("Cannot delete your own account");
    }

    const result = await query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [id]
    );

    return result.rows.length > 0;
}
