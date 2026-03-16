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

import { GET, POST } from "@/app/api/staff/tags/route";
import { GET as GET_ONE, PUT, DELETE } from "@/app/api/staff/tags/[id]/route";
import {
    GET as GET_WORK_TAGS,
    POST as POST_WORK_TAG,
    DELETE as DELETE_WORK_TAG,
} from "@/app/api/staff/works/[id]/tags/route";
import { NextRequest } from "next/server";

const staffUser = {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff",
    role: "staff",
};

function makeRequest(
    url: string,
    body?: Record<string, unknown>,
    method = "POST"
): NextRequest {
    return new NextRequest(url, {
        method: body ? method : "GET",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

function makeParams(id: string) {
    return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(staffUser);
});

// ─── GET /api/staff/tags ────────────────────────────────────────────

describe("GET /api/staff/tags", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET();
        expect(res.status).toBe(401);
    });

    it("returns 403 when user role is user", async () => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
        const res = await GET();
        expect(res.status).toBe(403);
    });

    it("returns all tags for staff", async () => {
        const tags = [
            { id: "t1", name: "Fiction" },
            { id: "t2", name: "Science" },
        ];
        mockQuery.mockResolvedValue({ rows: tags });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(tags);
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const res = await GET();
        expect(res.status).toBe(500);
    });
});

// ─── POST /api/staff/tags ───────────────────────────────────────────

describe("POST /api/staff/tags", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await POST(
            makeRequest("http://localhost:3000/api/staff/tags", { name: "Test" })
        );
        expect(res.status).toBe(401);
    });

    it("returns 400 when name is missing", async () => {
        const res = await POST(
            makeRequest("http://localhost:3000/api/staff/tags", { color: "#ff0000" })
        );
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("Name is required");
    });

    it("creates a tag successfully", async () => {
        const newTag = { id: "t1", name: "Fiction", color: null };
        mockQuery.mockResolvedValue({ rows: [newTag] });

        const res = await POST(
            makeRequest("http://localhost:3000/api/staff/tags", { name: "Fiction" })
        );
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(newTag);
    });

    it("returns 409 on duplicate tag name", async () => {
        mockQuery.mockRejectedValue({ code: "23505" });

        const res = await POST(
            makeRequest("http://localhost:3000/api/staff/tags", { name: "Duplicate" })
        );
        expect(res.status).toBe(409);
    });

    it("returns 403 for non-staff", async () => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
        const res = await POST(
            makeRequest("http://localhost:3000/api/staff/tags", { name: "Test" })
        );
        expect(res.status).toBe(403);
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const res = await POST(
            makeRequest("http://localhost:3000/api/staff/tags", { name: "Test" })
        );
        expect(res.status).toBe(500);
    });
});

// ─── GET /api/staff/tags/[id] ───────────────────────────────────────

describe("GET /api/staff/tags/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("t1"));
        expect(res.status).toBe(401);
    });

    it("returns 404 when tag not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t999", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("t999"));
        expect(res.status).toBe(404);
    });

    it("returns a single tag", async () => {
        const tag = { id: "t1", name: "Fiction", color: "#ff0000" };
        mockQuery.mockResolvedValue({ rows: [tag] });
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("t1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(tag);
    });
});

// ─── PUT /api/staff/tags/[id] ───────────────────────────────────────

describe("PUT /api/staff/tags/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Updated" }),
        });
        const res = await PUT(req, makeParams("t1"));
        expect(res.status).toBe(401);
    });

    it("returns 400 when no fields provided", async () => {
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        const res = await PUT(req, makeParams("t1"));
        expect(res.status).toBe(400);
    });

    it("updates a tag successfully", async () => {
        const updated = { id: "t1", name: "Updated" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Updated" }),
        });
        const res = await PUT(req, makeParams("t1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
    });

    it("returns 404 when tag not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t999", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Nope" }),
        });
        const res = await PUT(req, makeParams("t999"));
        expect(res.status).toBe(404);
    });

    it("returns 409 on duplicate tag name", async () => {
        mockQuery.mockRejectedValue({ code: "23505" });

        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Duplicate" }),
        });
        const res = await PUT(req, makeParams("t1"));
        expect(res.status).toBe(409);
    });
});

// ─── DELETE /api/staff/tags/[id] ────────────────────────────────────

describe("DELETE /api/staff/tags/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("t1"));
        expect(res.status).toBe(401);
    });

    it("deletes a tag successfully", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "t1" }] });
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("t1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
    });

    it("returns 404 when tag not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t999", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("t999"));
        expect(res.status).toBe(404);
    });

    it("returns 403 for non-staff", async () => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
        const req = new NextRequest("http://localhost:3000/api/staff/tags/t1", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("t1"));
        expect(res.status).toBe(403);
    });
});

// ─── GET /api/staff/works/[id]/tags ─────────────────────────────────

describe("GET /api/staff/works/[id]/tags", () => {
    it("returns tags for a work", async () => {
        const tags = [{ id: "t1", name: "Fiction" }];
        mockQuery.mockResolvedValue({ rows: tags });

        const req = new NextRequest("http://localhost:3000/api/staff/works/w1/tags", {
            method: "GET",
        });
        const res = await GET_WORK_TAGS(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(tags);
    });
});

// ─── POST /api/staff/works/[id]/tags ────────────────────────────────

describe("POST /api/staff/works/[id]/tags", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = makeRequest(
            "http://localhost:3000/api/staff/works/w1/tags",
            { tag_id: "t1" }
        );
        const res = await POST_WORK_TAG(req, makeParams("w1"));
        expect(res.status).toBe(401);
    });

    it("returns 400 when tag_id is missing", async () => {
        const req = makeRequest(
            "http://localhost:3000/api/staff/works/w1/tags",
            { other: "value" }
        );
        const res = await POST_WORK_TAG(req, makeParams("w1"));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("tag_id is required");
    });

    it("adds a tag to a work successfully", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = makeRequest(
            "http://localhost:3000/api/staff/works/w1/tags",
            { tag_id: "t1" }
        );
        const res = await POST_WORK_TAG(req, makeParams("w1"));

        expect(res.status).toBe(201);
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = makeRequest(
            "http://localhost:3000/api/staff/works/w1/tags",
            { tag_id: "t1" }
        );
        const res = await POST_WORK_TAG(req, makeParams("w1"));
        expect(res.status).toBe(500);
    });
});

// ─── DELETE /api/staff/works/[id]/tags ──────────────────────────────

describe("DELETE /api/staff/works/[id]/tags", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/staff/works/w1/tags", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag_id: "t1" }),
        });
        const res = await DELETE_WORK_TAG(req, makeParams("w1"));
        expect(res.status).toBe(401);
    });

    it("returns 400 when tag_id is missing", async () => {
        const req = new NextRequest("http://localhost:3000/api/staff/works/w1/tags", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        const res = await DELETE_WORK_TAG(req, makeParams("w1"));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("tag_id is required");
    });

    it("removes a tag from a work successfully", async () => {
        mockQuery.mockResolvedValue({ rows: [{ work_id: "w1" }] });
        const req = new NextRequest("http://localhost:3000/api/staff/works/w1/tags", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag_id: "t1" }),
        });
        const res = await DELETE_WORK_TAG(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
    });

    it("returns 404 when tag assignment not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost:3000/api/staff/works/w1/tags", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag_id: "t999" }),
        });
        const res = await DELETE_WORK_TAG(req, makeParams("w1"));
        expect(res.status).toBe(404);
    });
});
