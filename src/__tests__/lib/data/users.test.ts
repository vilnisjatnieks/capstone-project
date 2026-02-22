/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
const mockHashPassword = jest.fn();
jest.mock("@/lib/auth", () => ({
    getCurrentUser: () => mockGetCurrentUser(),
    hashPassword: (pw: string) => mockHashPassword(pw),
}));

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
    query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import {
    getAllUsers,
    getAdminAllUsers,
    createUser,
    updateUser,
    deleteUser,
} from "@/lib/data/users";

const staffUser = {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff",
    role: "staff",
};

const adminUser = {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
};

const regularUser = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
};

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockHashPassword.mockResolvedValue("hashed-password");
});

// ─── getAllUsers (staff) ─────────────────────────────────────────────

describe("getAllUsers", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getAllUsers()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getAllUsers()).rejects.toThrow("Forbidden");
    });

    it("allows staff users", async () => {
        mockGetCurrentUser.mockResolvedValue(staffUser);
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllUsers()).resolves.toEqual([]);
    });

    it("allows admin users", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllUsers()).resolves.toEqual([]);
    });

    it("returns all users with minimal fields", async () => {
        const users = [
            { id: "u1", name: "Alice", email: "alice@example.com" },
            { id: "u2", name: "Bob", email: "bob@example.com" },
        ];
        mockQuery.mockResolvedValue({ rows: users });

        const result = await getAllUsers();

        expect(result).toEqual(users);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT id, name, email"),
            undefined
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY name ASC"),
            undefined
        );
    });
});

// ─── getAdminAllUsers (admin) ───────────────────────────────────────

describe("getAdminAllUsers", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getAdminAllUsers()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is staff", async () => {
        mockGetCurrentUser.mockResolvedValue(staffUser);
        await expect(getAdminAllUsers()).rejects.toThrow("Forbidden");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getAdminAllUsers()).rejects.toThrow("Forbidden");
    });

    it("returns all users with full fields for admin", async () => {
        const users = [
            { id: "u1", email: "a@b.com", name: "A", role: "admin" },
        ];
        mockQuery.mockResolvedValue({ rows: users });

        const result = await getAdminAllUsers();

        expect(result).toEqual(users);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT id, email, name, role"),
            undefined
        );
    });
});

// ─── createUser (admin) ─────────────────────────────────────────────

describe("createUser", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(
            createUser({ email: "a@b.com", name: "A", password: "pass" })
        ).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is staff", async () => {
        mockGetCurrentUser.mockResolvedValue(staffUser);
        await expect(
            createUser({ email: "a@b.com", name: "A", password: "pass" })
        ).rejects.toThrow("Forbidden");
    });

    it("throws when required fields are missing", async () => {
        await expect(
            createUser({ email: "", name: "A", password: "pass" })
        ).rejects.toThrow("Email, name, and password are required");

        await expect(
            createUser({ email: "a@b.com", name: "", password: "pass" })
        ).rejects.toThrow("Email, name, and password are required");

        await expect(
            createUser({ email: "a@b.com", name: "A", password: "" })
        ).rejects.toThrow("Email, name, and password are required");
    });

    it("throws when email already exists", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "existing" }] });

        await expect(
            createUser({ email: "taken@b.com", name: "A", password: "pass" })
        ).rejects.toThrow("Email already in use");
    });

    it("creates a user successfully", async () => {
        const newUser = { id: "new-1", email: "new@b.com", name: "New", role: "user" };
        mockQuery
            .mockResolvedValueOnce({ rows: [] }) // email check
            .mockResolvedValueOnce({ rows: [newUser] }); // insert

        const result = await createUser({
            email: "new@b.com",
            name: "New",
            password: "pass123",
        });

        expect(result).toEqual(newUser);
        expect(mockHashPassword).toHaveBeenCalledWith("pass123");
    });

    it("defaults role to user", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: "1" }] });

        await createUser({ email: "a@b.com", name: "A", password: "pass" });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["user"])
        );
    });

    it("uses provided role", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: "1" }] });

        await createUser({
            email: "a@b.com",
            name: "A",
            password: "pass",
            role: "staff",
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["staff"])
        );
    });
});

// ─── updateUser (admin) ─────────────────────────────────────────────

describe("updateUser", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(updateUser("u1", { name: "X" })).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when role is staff", async () => {
        mockGetCurrentUser.mockResolvedValue(staffUser);
        await expect(updateUser("u1", { name: "X" })).rejects.toThrow(
            "Forbidden"
        );
    });

    it("throws when no fields are provided", async () => {
        await expect(updateUser("u1", {})).rejects.toThrow(
            "At least one field is required"
        );
    });

    it("throws when trying to change own role", async () => {
        await expect(
            updateUser("admin-1", { role: "user" })
        ).rejects.toThrow("Cannot change your own role");
    });

    it("throws when email already in use by another user", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "other" }] });

        await expect(
            updateUser("u2", { email: "taken@b.com" })
        ).rejects.toThrow("Email already in use");
    });

    it("updates a user successfully", async () => {
        const updated = { id: "u2", name: "Updated" };
        mockQuery.mockResolvedValueOnce({ rows: [updated] });

        const result = await updateUser("u2", { name: "Updated" });

        expect(result).toEqual(updated);
    });

    it("updates email with uniqueness check passing", async () => {
        const updated = { id: "u2", email: "new@b.com" };
        mockQuery
            .mockResolvedValueOnce({ rows: [] }) // email check
            .mockResolvedValueOnce({ rows: [updated] }); // update

        const result = await updateUser("u2", { email: "new@b.com" });

        expect(result).toEqual(updated);
    });

    it("hashes password when included in update", async () => {
        const updated = { id: "u2", name: "U" };
        mockQuery.mockResolvedValueOnce({ rows: [updated] });

        await updateUser("u2", { password: "newpass" });

        expect(mockHashPassword).toHaveBeenCalledWith("newpass");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("password_hash"),
            expect.arrayContaining(["hashed-password"])
        );
    });

    it("returns null when user not found", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await updateUser("u999", { name: "Nope" });

        expect(result).toBeNull();
    });
});

// ─── deleteUser (admin) ─────────────────────────────────────────────

describe("deleteUser", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(deleteUser("u1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is staff", async () => {
        mockGetCurrentUser.mockResolvedValue(staffUser);
        await expect(deleteUser("u1")).rejects.toThrow("Forbidden");
    });

    it("throws when trying to delete own account", async () => {
        await expect(deleteUser("admin-1")).rejects.toThrow(
            "Cannot delete your own account"
        );
    });

    it("deletes a user successfully", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "u2" }] });

        const result = await deleteUser("u2");

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("DELETE"),
            ["u2"]
        );
    });

    it("returns false when user not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await deleteUser("u999");

        expect(result).toBe(false);
    });
});
