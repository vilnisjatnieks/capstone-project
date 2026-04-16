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

const PAGE = { page: 1, pageSize: 20, offset: 0 };

describe("requireStaffUser (via getAllWorks)", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getAllWorks(PAGE)).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getAllWorks(PAGE)).rejects.toThrow("Forbidden");
    });

    it("allows staff users", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllWorks(PAGE)).resolves.toEqual({ rows: [], total: 0 });
    });

    it("allows admin users", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllWorks(PAGE)).resolves.toEqual({ rows: [], total: 0 });
    });
});

// ─── getAllWorks ─────────────────────────────────────────────────────

describe("getAllWorks", () => {
    it("returns paginated works with total", async () => {
        const works = [
            { id: "w1", title: "Book A", total_count: "2" },
            { id: "w2", title: "Book B", total_count: "2" },
        ];
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: works });
        });

        const result = await getAllWorks(PAGE);

        expect(result).toEqual({
            rows: [
                { id: "w1", title: "Book A", authors: [] },
                { id: "w2", title: "Book B", authors: [] },
            ],
            total: 2,
        });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("LIMIT $1 OFFSET $2"),
            [20, 0]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("COUNT(*) OVER()"),
            [20, 0]
        );
    });

    it("returns empty rows and zero total when no works exist", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await getAllWorks(PAGE);
        expect(result).toEqual({ rows: [], total: 0 });
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [work] });
        });

        const result = await getWorkById("w1");

        expect(result).toEqual({ ...work, authors: [] });
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [work] });
        });

        const result = await getPublicWorkById("w1");

        expect(result).toEqual({ ...work, authors: [] });
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

const SEARCH_PAGE = { page: 1, pageSize: 25, offset: 0 };

describe("searchWorks", () => {
    it("searches without any filters", async () => {
        const works = [{ id: "w1", title: "Book A", total_count: "1" }];
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: works });
        });

        const result = await searchWorks({}, SEARCH_PAGE);

        expect(result.rows).toEqual([{ id: "w1", title: "Book A", authors: [] }]);
        expect(result.total).toBe(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY w.title ASC"),
            [25, 0]
        );
    });

    it("searches with a text query", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ q: "test" }, SEARCH_PAGE);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%test%", 25, 0]
        );
    });

    it("searches with a media type filter", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ mediaType: "book" }, SEARCH_PAGE);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.media_type = $1"),
            ["book", 25, 0]
        );
    });

    it("searches with both query and media type", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ q: "test", mediaType: "ebook" }, SEARCH_PAGE);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%test%", "ebook", 25, 0]
        );
    });

    it("searches with a tag filter", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ tagId: "tag-1" }, SEARCH_PAGE);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["tag-1", 25, 0]
        );
    });

    it("searches with query, media type, and tag combined", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks(
            { q: "test", mediaType: "book", tagId: "tag-1" },
            SEARCH_PAGE
        );

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("wt.tag_id = $3"),
            ["%test%", "book", "tag-1", 25, 0]
        );
    });

    it("applies language filter", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ language: "French" }, SEARCH_PAGE);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.language = $1"),
            ["French", 25, 0]
        );
    });

    it("applies sort direction to ORDER BY", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await searchWorks({ sort: "date_published", dir: "desc" }, SEARCH_PAGE);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY w.date_published DESC"),
            [25, 0]
        );
    });

    it("does not require authentication (public endpoint)", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(searchWorks({}, SEARCH_PAGE)).resolves.toEqual({
            rows: [],
            total: 0,
            languages: [],
        });
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [newWork] });
        });

        const result = await createWork({ title: "New Work" });

        expect(result).toEqual({ ...newWork, authors: [] });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["New Work"])
        );
    });

    it("creates a work with all fields", async () => {
        const newWork = { id: "w2", title: "Full Work" };
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [newWork] });
        });

        const result = await createWork({
            title: "Full Work",
            date_published: "2024-01-01",
            publisher: "Acme",
            lccn: "123",
            isbn_10: "1234567890",
            isbn_13: "1234567890123",
            media_type: "book",
            number_of_pages: 200,
            language: "English",
            location: "Shelf A",
        });

        expect(result).toEqual({ ...newWork, authors: [] });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining([
                "Full Work",
                "2024-01-01",
                "Acme",
                200,
                "English",
            ])
        );
    });

    it("encodes cover from base64 to Buffer", async () => {
        const newWork = { id: "w3", title: "Work with Cover" };
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [newWork] });
        });

        await createWork({ title: "Work with Cover", cover: "aGVsbG8=" });

        const callArgs = mockQuery.mock.calls[0][1];
        // The 4th param (index 3) should be a Buffer
        expect(callArgs[3]).toBeInstanceOf(Buffer);
        expect(callArgs[3].toString()).toBe("hello");
    });

    it("passes null for cover when not provided", async () => {
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [{ id: "w4" }] });
        });

        await createWork({ title: "No Cover" });

        const callArgs = mockQuery.mock.calls[0][1];
        expect(callArgs[3]).toBeNull();
    });

    it("replaces contributors when provided", async () => {
        const newWork = { id: "w5", title: "Coauthored" };
        const authorRow = {
            work_id: "w5",
            id: "a1",
            name: "Jane",
            sort_name: null,
            role: "author",
            position: 0,
        };
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors"))
                return Promise.resolve({ rows: [authorRow] });
            if (text.includes("DELETE FROM work_authors"))
                return Promise.resolve({ rows: [] });
            if (text.includes("INSERT INTO work_authors"))
                return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [newWork] });
        });

        const result = await createWork({
            title: "Coauthored",
            contributors: [{ author_id: "a1", role: "author", position: 0 }],
        });

        expect(result.authors).toEqual([
            { id: "a1", name: "Jane", sort_name: null, role: "author", position: 0 },
        ]);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO work_authors"),
            ["w5", "a1", "author", 0]
        );
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [updated] });
        });

        const result = await updateWork("w1", { title: "Updated Title" });

        expect(result).toEqual({ ...updated, authors: [] });
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [updated] });
        });

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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [updated] });
        });

        await updateWork("w1", { cover: null });

        const callArgs = mockQuery.mock.calls[0][1];
        // Should contain null for cover and "w1" for id
        expect(callArgs).toContain(null);
    });

    it("updates multiple fields at once", async () => {
        const updated = { id: "w1", title: "New", publisher: "Acme" };
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [updated] });
        });

        const result = await updateWork("w1", {
            title: "New",
            publisher: "Acme",
        });

        expect(result).toEqual({ ...updated, authors: [] });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE works SET"),
            expect.arrayContaining(["New", "Acme", "w1"])
        );
    });

    it("replaces contributors only without updating fields", async () => {
        const existing = { id: "w1", title: "Existing" };
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            if (text.includes("DELETE FROM work_authors"))
                return Promise.resolve({ rows: [] });
            if (text.includes("INSERT INTO work_authors"))
                return Promise.resolve({ rows: [] });
            // SELECT on works for contributors-only path
            return Promise.resolve({ rows: [existing] });
        });

        const result = await updateWork("w1", {
            contributors: [{ author_id: "a1", role: "author", position: 0 }],
        });

        expect(result?.id).toBe("w1");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM work_authors"),
            ["w1"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO work_authors"),
            ["w1", "a1", "author", 0]
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
