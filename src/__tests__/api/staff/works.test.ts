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

import { GET, POST } from "@/app/api/staff/works/route";
import { GET as GET_ONE, PUT, DELETE } from "@/app/api/staff/works/[id]/route";
import { NextRequest } from "next/server";

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

function makeRequest(
    body?: Record<string, unknown>,
    method = "POST"
): NextRequest {
    return new NextRequest("http://localhost:3000/api/staff/works", {
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

// ─── GET /api/staff/works ────────────────────────────────────────────

describe("GET /api/staff/works", () => {
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

    it("returns all works for staff", async () => {
        const works = [
            { id: 1, title: "Work A" },
            { id: 2, title: "Work B" },
        ];
        mockQuery.mockResolvedValue({ rows: works });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(works);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            undefined
        );
    });

    it("returns all works for admin", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        mockQuery.mockResolvedValue({ rows: [] });

        const res = await GET();
        expect(res.status).toBe(200);
    });
});

// ─── POST /api/staff/works ───────────────────────────────────────────

describe("POST /api/staff/works", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await POST(makeRequest({ title: "Test" }));
        expect(res.status).toBe(401);
    });

    it("returns 400 when title is missing", async () => {
        const res = await POST(makeRequest({ publisher: "Acme" }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("Title is required");
    });

    it("creates a work successfully", async () => {
        const newWork = { id: 1, title: "New Work", publisher: null };
        mockQuery.mockResolvedValue({ rows: [newWork] });

        const res = await POST(makeRequest({ title: "New Work" }));
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(newWork);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["New Work"])
        );
    });

    it("creates a work with all fields", async () => {
        const newWork = { id: 2, title: "Full Work" };
        mockQuery.mockResolvedValue({ rows: [newWork] });

        const res = await POST(
            makeRequest({
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
            })
        );

        expect(res.status).toBe(201);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["Full Work", "Acme", "Editor", 200, "English"])
        );
    });
});

// ─── GET /api/staff/works/[id] ───────────────────────────────────────

describe("GET /api/staff/works/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("1"));
        expect(res.status).toBe(401);
    });

    it("returns 404 when work not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost:3000/api/staff/works/999", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("999"));
        expect(res.status).toBe(404);
    });

    it("returns a single work", async () => {
        const work = { id: 1, title: "Work A", cover: null };
        mockQuery.mockResolvedValue({ rows: [work] });
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(work);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("encode(cover"),
            ["1"]
        );
    });
});

// ─── PUT /api/staff/works/[id] ───────────────────────────────────────

describe("PUT /api/staff/works/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Updated" }),
        });
        const res = await PUT(req, makeParams("1"));
        expect(res.status).toBe(401);
    });

    it("returns 400 when no fields provided", async () => {
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        const res = await PUT(req, makeParams("1"));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("At least one field");
    });

    it("updates a work successfully", async () => {
        const updated = { id: 1, title: "Updated Title" };
        mockQuery.mockResolvedValue({ rows: [updated] });

        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Updated Title" }),
        });
        const res = await PUT(req, makeParams("1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(updated);
    });

    it("returns 404 when work not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost:3000/api/staff/works/999", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Nope" }),
        });
        const res = await PUT(req, makeParams("999"));
        expect(res.status).toBe(404);
    });
});

// ─── DELETE /api/staff/works/[id] ────────────────────────────────────

describe("DELETE /api/staff/works/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("1"));
        expect(res.status).toBe(401);
    });

    it("deletes a work successfully", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
    });

    it("returns 404 when work not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest("http://localhost:3000/api/staff/works/999", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("999"));
        expect(res.status).toBe(404);
    });
});
