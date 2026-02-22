/**
 * @jest-environment node
 */

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
    query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

import {
    createSession,
    deleteSession,
    getSessionWithUser,
} from "@/lib/data/sessions";

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── createSession ──────────────────────────────────────────────────

describe("createSession", () => {
    it("inserts a session and returns the id", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "session-123" }] });
        const expiresAt = new Date("2026-03-01T00:00:00Z");

        const result = await createSession("user-456", expiresAt);

        expect(result).toBe("session-123");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO sessions"),
            ["user-456", expiresAt]
        );
    });
});

// ─── deleteSession ──────────────────────────────────────────────────

describe("deleteSession", () => {
    it("deletes a session by id", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await deleteSession("session-123");

        expect(mockQuery).toHaveBeenCalledWith(
            "DELETE FROM sessions WHERE id = $1",
            ["session-123"]
        );
    });
});

// ─── getSessionWithUser ─────────────────────────────────────────────

describe("getSessionWithUser", () => {
    it("returns the user when session is valid", async () => {
        const mockUser = {
            id: "user-456",
            email: "test@example.com",
            name: "Test User",
            role: "user",
            created_at: new Date(),
            updated_at: new Date(),
        };
        mockQuery.mockResolvedValue({ rows: [mockUser] });

        const user = await getSessionWithUser("session-123");

        expect(user).toEqual(mockUser);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN sessions"),
            ["session-123"]
        );
    });

    it("returns null when session is not found or expired", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const user = await getSessionWithUser("session-expired");

        expect(user).toBeNull();
    });

    it("queries with the correct columns", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getSessionWithUser("session-123");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("u.id, u.email, u.name, u.role"),
            ["session-123"]
        );
    });

    it("filters by expires_at > NOW()", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getSessionWithUser("session-123");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("s.expires_at > NOW()"),
            ["session-123"]
        );
    });
});
