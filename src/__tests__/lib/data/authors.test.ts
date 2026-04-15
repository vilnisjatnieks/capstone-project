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
    createAuthor,
    getAuthorById,
    getAuthorWithWorks,
    updateAuthor,
    searchAuthors,
    findAuthorByNameCaseInsensitive,
    deleteAuthor,
} from "@/lib/data/authors";

const staffUser = { id: "s1", email: "s@x.com", name: "S", role: "staff" };
const regularUser = { id: "u1", email: "u@x.com", name: "U", role: "user" };

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(staffUser);
});

describe("createAuthor", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(createAuthor({ name: "Jane" })).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(createAuthor({ name: "Jane" })).rejects.toThrow("Forbidden");
    });

    it("throws when name is blank", async () => {
        await expect(createAuthor({ name: "   " })).rejects.toThrow("Name is required");
    });

    it("creates an author with trimmed name", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "a1", name: "Jane Smith", sort_name: null, created_at: "t" }],
        });
        const result = await createAuthor({ name: "  Jane Smith  " });
        expect(result.id).toBe("a1");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO authors"),
            ["Jane Smith", null]
        );
    });

    it("passes sort_name through", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "a2", name: "bell hooks", sort_name: "hooks, bell", created_at: "t" }],
        });
        await createAuthor({ name: "bell hooks", sort_name: "hooks, bell" });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            ["bell hooks", "hooks, bell"]
        );
    });
});

describe("getAuthorById", () => {
    it("returns an author when found", async () => {
        const author = { id: "a1", name: "Jane", sort_name: null, created_at: "t" };
        mockQuery.mockResolvedValue({ rows: [author] });
        const result = await getAuthorById("a1");
        expect(result).toEqual(author);
    });

    it("returns null when not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await getAuthorById("missing");
        expect(result).toBeNull();
    });

    it("allows unauthenticated access", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAuthorById("a1")).resolves.toBeNull();
    });
});

describe("getAuthorWithWorks", () => {
    it("returns author + works grouped by role", async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{ id: "a1", name: "Jane", sort_name: null, created_at: "t" }],
            })
            .mockResolvedValueOnce({
                rows: [
                    { id: "w1", title: "Book A", date_published: null, publisher: null, role: "author" },
                    { id: "w2", title: "Book B", date_published: null, publisher: null, role: "editor" },
                ],
            });

        const result = await getAuthorWithWorks("a1");
        expect(result?.works).toHaveLength(2);
        expect(result?.works[0].role).toBe("author");
        expect(result?.works[1].role).toBe("editor");
    });

    it("returns null if author missing", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const result = await getAuthorWithWorks("missing");
        expect(result).toBeNull();
    });
});

describe("updateAuthor", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(updateAuthor("a1", { name: "X" })).rejects.toThrow("Unauthorized");
    });

    it("throws when no fields provided", async () => {
        await expect(updateAuthor("a1", {})).rejects.toThrow("At least one field is required");
    });

    it("throws when name is blank string", async () => {
        await expect(updateAuthor("a1", { name: "  " })).rejects.toThrow("Name cannot be empty");
    });

    it("updates name only", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "a1", name: "New", sort_name: null, created_at: "t" }],
        });
        const result = await updateAuthor("a1", { name: "New" });
        expect(result?.name).toBe("New");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE authors"),
            ["New", "a1"]
        );
    });

    it("updates sort_name to null", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "a1", name: "Jane", sort_name: null, created_at: "t" }],
        });
        await updateAuthor("a1", { sort_name: null });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [null, "a1"]
        );
    });

    it("returns null when author not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await updateAuthor("missing", { name: "X" });
        expect(result).toBeNull();
    });
});

describe("searchAuthors", () => {
    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(searchAuthors("jane")).rejects.toThrow("Forbidden");
    });

    it("searches case-insensitively via ILIKE with wildcards", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await searchAuthors("jane");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%jane%"]
        );
    });

    it("returns matches", async () => {
        const authors = [
            { id: "a1", name: "Jane Smith", sort_name: null, created_at: "t" },
            { id: "a2", name: "Jane Doe", sort_name: null, created_at: "t" },
        ];
        mockQuery.mockResolvedValue({ rows: authors });
        const result = await searchAuthors("jane");
        expect(result).toEqual(authors);
    });
});

describe("findAuthorByNameCaseInsensitive", () => {
    it("returns null for blank name", async () => {
        const result = await findAuthorByNameCaseInsensitive("   ");
        expect(result).toBeNull();
    });

    it("queries with lower() on both sides", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "a1", name: "Jane Smith", sort_name: null, created_at: "t" }],
        });
        await findAuthorByNameCaseInsensitive("jane smith");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("lower(name) = lower"),
            ["jane smith"]
        );
    });

    it("returns null when no match", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await findAuthorByNameCaseInsensitive("missing");
        expect(result).toBeNull();
    });

    it("returns the matched author", async () => {
        const author = { id: "a1", name: "Jane Smith", sort_name: null, created_at: "t" };
        mockQuery.mockResolvedValue({ rows: [author] });
        const result = await findAuthorByNameCaseInsensitive("JANE SMITH");
        expect(result).toEqual(author);
    });
});

describe("deleteAuthor", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(deleteAuthor("a1")).rejects.toThrow("Unauthorized");
    });

    it("returns true when deleted", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "a1" }] });
        const result = await deleteAuthor("a1");
        expect(result).toBe(true);
    });

    it("returns false when not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await deleteAuthor("missing");
        expect(result).toBe(false);
    });

    it("translates foreign key violation to friendly error", async () => {
        mockQuery.mockRejectedValue(new Error("update or delete on table violates foreign key constraint"));
        await expect(deleteAuthor("a1")).rejects.toThrow("Author has attached works");
    });
});
