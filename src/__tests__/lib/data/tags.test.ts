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
    getAllTags,
    getPublicTags,
    getTagById,
    getTagsForWork,
    getTagsForWorks,
    createTag,
    updateTag,
    deleteTag,
    addTagToWork,
    removeTagFromWork,
} from "@/lib/data/tags";

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

describe("requireStaffUser (via getAllTags)", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getAllTags()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getAllTags()).rejects.toThrow("Forbidden");
    });

    it("allows staff users", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllTags()).resolves.toEqual([]);
    });

    it("allows admin users", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllTags()).resolves.toEqual([]);
    });
});

// ─── getAllTags ──────────────────────────────────────────────────────

describe("getAllTags", () => {
    it("returns all tags from the database", async () => {
        const tags = [
            { id: "t1", name: "Fiction" },
            { id: "t2", name: "Science" },
        ];
        mockQuery.mockResolvedValue({ rows: tags });

        const result = await getAllTags();

        expect(result).toEqual(tags);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            undefined
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY name ASC"),
            undefined
        );
    });

    it("returns an empty array when no tags exist", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await getAllTags();
        expect(result).toEqual([]);
    });
});

// ─── getPublicTags ──────────────────────────────────────────────────

describe("getPublicTags", () => {
    it("returns all tags without requiring auth", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const tags = [{ id: "t1", name: "Fiction" }];
        mockQuery.mockResolvedValue({ rows: tags });

        const result = await getPublicTags();

        expect(result).toEqual(tags);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY name ASC"),
            undefined
        );
    });

    it("returns an empty array when no tags exist", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await getPublicTags();
        expect(result).toEqual([]);
    });
});

// ─── getTagById ─────────────────────────────────────────────────────

describe("getTagById", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getTagById("t1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getTagById("t1")).rejects.toThrow("Forbidden");
    });

    it("returns a tag by id", async () => {
        const tag = { id: "t1", name: "Fiction", color: "#ff0000" };
        mockQuery.mockResolvedValue({ rows: [tag] });

        const result = await getTagById("t1");

        expect(result).toEqual(tag);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("WHERE id = $1"),
            ["t1"]
        );
    });

    it("returns null when tag not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getTagById("t999");

        expect(result).toBeNull();
    });
});

// ─── getTagsForWork ─────────────────────────────────────────────────

describe("getTagsForWork", () => {
    it("returns tags for a work without requiring auth", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const tags = [{ id: "t1", name: "Fiction" }];
        mockQuery.mockResolvedValue({ rows: tags });

        const result = await getTagsForWork("w1");

        expect(result).toEqual(tags);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["w1"]
        );
    });

    it("returns empty array when work has no tags", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getTagsForWork("w1");

        expect(result).toEqual([]);
    });
});

// ─── getTagsForWorks ────────────────────────────────────────────────

describe("getTagsForWorks", () => {
    it("returns empty object for empty array", async () => {
        const result = await getTagsForWorks([]);
        expect(result).toEqual({});
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it("returns tags grouped by work id", async () => {
        const rows = [
            { work_id: "w1", id: "t1", name: "Fiction", color: "#ff0000", created_at: "x", updated_at: "x" },
            { work_id: "w1", id: "t2", name: "History", color: null, created_at: "x", updated_at: "x" },
            { work_id: "w2", id: "t1", name: "Fiction", color: "#ff0000", created_at: "x", updated_at: "x" },
        ];
        mockQuery.mockResolvedValue({ rows });

        const result = await getTagsForWorks(["w1", "w2"]);

        expect(result["w1"]).toHaveLength(2);
        expect(result["w2"]).toHaveLength(1);
        expect(result["w1"][0].name).toBe("Fiction");
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("IN ($1, $2)"),
            ["w1", "w2"]
        );
    });

    it("returns empty arrays for works with no tags", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getTagsForWorks(["w1"]);

        expect(result).toEqual({});
    });
});

// ─── createTag ──────────────────────────────────────────────────────

describe("createTag", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(createTag({ name: "Test" })).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(createTag({ name: "Test" })).rejects.toThrow(
            "Forbidden"
        );
    });

    it("creates a tag with name only", async () => {
        const newTag = { id: "t1", name: "Fiction", color: null };
        mockQuery.mockResolvedValue({ rows: [newTag] });

        const result = await createTag({ name: "Fiction" });

        expect(result).toEqual(newTag);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            ["Fiction", null]
        );
    });

    it("creates a tag with name and color", async () => {
        const newTag = { id: "t1", name: "Fiction", color: "#ff0000" };
        mockQuery.mockResolvedValue({ rows: [newTag] });

        const result = await createTag({ name: "Fiction", color: "#ff0000" });

        expect(result).toEqual(newTag);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            ["Fiction", "#ff0000"]
        );
    });

    it("throws 'Tag name already exists' on duplicate name", async () => {
        mockQuery.mockRejectedValue({ code: "23505" });

        await expect(createTag({ name: "Duplicate" })).rejects.toThrow(
            "Tag name already exists"
        );
    });

    it("re-throws non-duplicate errors", async () => {
        mockQuery.mockRejectedValue(new Error("Connection failed"));

        await expect(createTag({ name: "Test" })).rejects.toThrow(
            "Connection failed"
        );
    });
});

// ─── updateTag ──────────────────────────────────────────────────────

describe("updateTag", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(updateTag("t1", { name: "X" })).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(updateTag("t1", { name: "X" })).rejects.toThrow(
            "Forbidden"
        );
    });

    it("throws when no fields are provided", async () => {
        await expect(updateTag("t1", {})).rejects.toThrow(
            "At least one field is required"
        );
    });

    it("updates a tag successfully", async () => {
        const updated = { id: "t1", name: "Updated" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        const result = await updateTag("t1", { name: "Updated" });

        expect(result).toEqual(updated);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE tags SET"),
            expect.arrayContaining(["Updated", "t1"])
        );
    });

    it("returns null when tag is not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await updateTag("t999", { name: "Nope" });

        expect(result).toBeNull();
    });

    it("updates multiple fields at once", async () => {
        const updated = { id: "t1", name: "New", color: "#00ff00" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        const result = await updateTag("t1", {
            name: "New",
            color: "#00ff00",
        });

        expect(result).toEqual(updated);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE tags SET"),
            expect.arrayContaining(["New", "#00ff00", "t1"])
        );
    });

    it("throws 'Tag name already exists' on duplicate name", async () => {
        mockQuery.mockRejectedValue({ code: "23505" });

        await expect(updateTag("t1", { name: "Duplicate" })).rejects.toThrow(
            "Tag name already exists"
        );
    });
});

// ─── deleteTag ──────────────────────────────────────────────────────

describe("deleteTag", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(deleteTag("t1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(deleteTag("t1")).rejects.toThrow("Forbidden");
    });

    it("returns true when tag is deleted", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "t1" }] });

        const result = await deleteTag("t1");

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("DELETE"),
            ["t1"]
        );
    });

    it("returns false when tag is not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await deleteTag("t999");

        expect(result).toBe(false);
    });
});

// ─── addTagToWork ───────────────────────────────────────────────────

describe("addTagToWork", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(addTagToWork("w1", "t1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(addTagToWork("w1", "t1")).rejects.toThrow("Forbidden");
    });

    it("adds a tag to a work", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await addTagToWork("w1", "t1");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO work_tags"),
            ["w1", "t1"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ON CONFLICT DO NOTHING"),
            ["w1", "t1"]
        );
    });
});

// ─── removeTagFromWork ──────────────────────────────────────────────

describe("removeTagFromWork", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(removeTagFromWork("w1", "t1")).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(removeTagFromWork("w1", "t1")).rejects.toThrow(
            "Forbidden"
        );
    });

    it("returns true when tag assignment is removed", async () => {
        mockQuery.mockResolvedValue({ rows: [{ work_id: "w1" }] });

        const result = await removeTagFromWork("w1", "t1");

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM work_tags"),
            ["w1", "t1"]
        );
    });

    it("returns false when tag assignment not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await removeTagFromWork("w1", "t1");

        expect(result).toBe(false);
    });
});
