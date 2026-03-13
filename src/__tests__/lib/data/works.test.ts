/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
jest.mock("@/lib/auth", () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
    query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import {
    getAllWorks,
    getWorkById,
    searchWorks,
    createWork,
    updateWork,
    deleteWork,
    getPublicWorkById,
} from "@/lib/data/works";

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
    mockGetCurrentUser.mockResolvedValue(staffUser);
});

// ─── Authorization (shared across all staff-only functions) ─────────

describe("requireStaffUser (via getAllWorks)", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getAllWorks()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getAllWorks()).rejects.toThrow("Forbidden");
    });

    it("allows staff users", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllWorks()).resolves.toEqual([]);
    });

    it("allows admin users", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllWorks()).resolves.toEqual([]);
    });
});

// ─── getAllWorks ─────────────────────────────────────────────────────

describe("getAllWorks", () => {
    it("returns all works from the database", async () => {
        const works = [
            { id: "w1", title: "Book A" },
            { id: "w2", title: "Book B" },
        ];
        mockQuery.mockResolvedValue({ rows: works });

        const result = await getAllWorks();

        expect(result).toEqual(works);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            undefined
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY created_at DESC"),
            undefined
        );
    });

    it("returns an empty array when no works exist", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await getAllWorks();
        expect(result).toEqual([]);
    });
});

// ─── getWorkById ────────────────────────────────────────────────────

describe("getWorkById", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getWorkById("w1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getWorkById("w1")).rejects.toThrow("Forbidden");
    });

    it("returns a work with cover data", async () => {
        const work = { id: "w1", title: "Book A", cover: "base64data" };
        mockQuery.mockResolvedValue({ rows: [work] });

        const result = await getWorkById("w1");

        expect(result).toEqual(work);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("encode(cover"),
            ["w1"]
        );
    });

    it("returns null when work not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getWorkById("w999");

        expect(result).toBeNull();
    });
});

// ─── getPublicWorkById ────────────────────────────────────────────────

describe("getPublicWorkById", () => {
    it("returns a work with cover data without throwing Unauthorized", async () => {
        // Even if user is null, it should not throw
        mockGetCurrentUser.mockResolvedValue(null);

        const work = { id: "w1", title: "Book A", cover: "base64data" };
        mockQuery.mockResolvedValue({ rows: [work] });

        const result = await getPublicWorkById("w1");

        expect(result).toEqual(work);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("encode(cover"),
            ["w1"]
        );
    });

    it("returns null when work not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getPublicWorkById("w999");

        expect(result).toBeNull();
    });
});

// ─── searchWorks ────────────────────────────────────────────────────

describe("searchWorks", () => {
    it("searches without any filters", async () => {
        const works = [{ id: "w1", title: "Book A" }];
        mockQuery.mockResolvedValue({ rows: works });

        const result = await searchWorks({});

        expect(result).toEqual(works);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY w.title ASC"),
            undefined
        );
        // Should NOT have a WHERE clause
        expect(mockQuery).toHaveBeenCalledWith(
            expect.not.stringContaining("WHERE"),
            undefined
        );
    });

    it("searches with a text query", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ q: "test" });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%test%"]
        );
    });

    it("searches with a media type filter", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ mediaType: "book" });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.media_type = $1"),
            ["book"]
        );
    });

    it("searches with both query and media type", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ q: "test", mediaType: "ebook" });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%test%", "ebook"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.media_type = $2"),
            ["%test%", "ebook"]
        );
    });

    it("searches with a tag filter", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ tagId: "tag-1" });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["tag-1"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("wt.tag_id = $1"),
            ["tag-1"]
        );
    });

    it("searches with query, media type, and tag combined", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ q: "test", mediaType: "book", tagId: "tag-1" });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["%test%", "book", "tag-1"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("wt.tag_id = $3"),
            ["%test%", "book", "tag-1"]
        );
    });

    it("does not require authentication (public endpoint)", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        mockQuery.mockResolvedValue({ rows: [] });

        // Should NOT throw
        await expect(searchWorks({})).resolves.toEqual([]);
    });
});

// ─── createWork ─────────────────────────────────────────────────────

describe("createWork", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(createWork({ title: "Test" })).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(createWork({ title: "Test" })).rejects.toThrow(
            "Forbidden"
        );
    });

    it("creates a work with only required fields", async () => {
        const newWork = { id: "w1", title: "New Work" };
        mockQuery.mockResolvedValue({ rows: [newWork] });

        const result = await createWork({ title: "New Work" });

        expect(result).toEqual(newWork);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["New Work"])
        );
    });

    it("creates a work with all fields", async () => {
        const newWork = { id: "w2", title: "Full Work" };
        mockQuery.mockResolvedValue({ rows: [newWork] });

        const result = await createWork({
            title: "Full Work",
            date_published: "2024-01-01",
            publisher: "Acme",
            editor: "Editor",
            lccn: "123",
            isbn_10: "1234567890",
            isbn_13: "1234567890123",
            media_type: "book",
            number_of_pages: 200,
            language: "English",
            location: "Shelf A",
        });

        expect(result).toEqual(newWork);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining([
                "Full Work",
                "2024-01-01",
                "Acme",
                "Editor",
                200,
                "English",
            ])
        );
    });

    it("encodes cover from base64 to Buffer", async () => {
        const newWork = { id: "w3", title: "Work with Cover" };
        mockQuery.mockResolvedValue({ rows: [newWork] });

        await createWork({ title: "Work with Cover", cover: "aGVsbG8=" });

        const callArgs = mockQuery.mock.calls[0][1];
        // The 4th param (index 3) should be a Buffer
        expect(callArgs[3]).toBeInstanceOf(Buffer);
        expect(callArgs[3].toString()).toBe("hello");
    });

    it("passes null for cover when not provided", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "w4" }] });

        await createWork({ title: "No Cover" });

        const callArgs = mockQuery.mock.calls[0][1];
        expect(callArgs[3]).toBeNull();
    });
});

// ─── updateWork ─────────────────────────────────────────────────────

describe("updateWork", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(updateWork("w1", { title: "X" })).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(updateWork("w1", { title: "X" })).rejects.toThrow(
            "Forbidden"
        );
    });

    it("throws when no fields are provided", async () => {
        await expect(updateWork("w1", {})).rejects.toThrow(
            "At least one field is required"
        );
    });

    it("updates a work successfully", async () => {
        const updated = { id: "w1", title: "Updated Title" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        const result = await updateWork("w1", { title: "Updated Title" });

        expect(result).toEqual(updated);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE works SET"),
            expect.arrayContaining(["Updated Title", "w1"])
        );
    });

    it("returns null when work is not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await updateWork("w999", { title: "Nope" });

        expect(result).toBeNull();
    });

    it("handles cover update with base64 decoding", async () => {
        const updated = { id: "w1", title: "Work" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        await updateWork("w1", { cover: "aGVsbG8=" });

        const callArgs = mockQuery.mock.calls[0][1];
        // The cover value should be a Buffer
        const coverParam = callArgs.find(
            (p: unknown) => p instanceof Buffer
        );
        expect(coverParam).toBeDefined();
        expect(coverParam.toString()).toBe("hello");
    });

    it("handles cover set to null (removal)", async () => {
        const updated = { id: "w1", title: "Work" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        await updateWork("w1", { cover: null });

        const callArgs = mockQuery.mock.calls[0][1];
        // Should contain null for cover and "w1" for id
        expect(callArgs).toContain(null);
    });

    it("updates multiple fields at once", async () => {
        const updated = { id: "w1", title: "New", publisher: "Acme" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        const result = await updateWork("w1", {
            title: "New",
            publisher: "Acme",
        });

        expect(result).toEqual(updated);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE works SET"),
            expect.arrayContaining(["New", "Acme", "w1"])
        );
    });
});

// ─── deleteWork ─────────────────────────────────────────────────────

describe("deleteWork", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(deleteWork("w1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(deleteWork("w1")).rejects.toThrow("Forbidden");
    });

    it("returns true when work is deleted", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "w1" }] });

        const result = await deleteWork("w1");

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("DELETE"),
            ["w1"]
        );
    });

    it("returns false when work is not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await deleteWork("w999");

        expect(result).toBe(false);
    });
});
