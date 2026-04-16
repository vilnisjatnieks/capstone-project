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

function makeGetRequest(qs = ""): NextRequest {
    return new NextRequest(`http://localhost:3000/api/staff/works${qs}`, {
        method: "GET",
    });
}

describe("GET /api/staff/works", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(401);
    });

    it("returns 403 when user role is user", async () => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(403);
    });

    it("returns paginated works for staff", async () => {
        const works = [
            { id: 1, title: "Work A", total_count: "2" },
            { id: 2, title: "Work B", total_count: "2" },
        ];
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: works });
        });

        const res = await GET(makeGetRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            items: [
                { id: 1, title: "Work A", authors: [] },
                { id: 2, title: "Work B", authors: [] },
            ],
            total: 2,
            page: 1,
            pageSize: 20,
        });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("LIMIT $1 OFFSET $2"),
            [20, 0]
        );
    });

    it("applies page and pageSize query params", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const res = await GET(makeGetRequest("?page=3&pageSize=10"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ items: [], total: 0, page: 3, pageSize: 10 });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("LIMIT"),
            [10, 20]
        );
    });

    it("returns works for admin", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        mockQuery.mockResolvedValue({ rows: [] });

        const res = await GET(makeGetRequest());
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [newWork] });
        });

        const res = await POST(makeRequest({ title: "New Work" }));
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual({ ...newWork, authors: [] });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["New Work"])
        );
    });

    it("creates a work with all fields", async () => {
        const newWork = { id: 2, title: "Full Work" };
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [newWork] });
        });

        const res = await POST(
            makeRequest({
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
            })
        );

        expect(res.status).toBe(201);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            expect.arrayContaining(["Full Work", "Acme", 200, "English"])
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [work] });
        });
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ ...work, authors: [] });
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
        mockQuery.mockImplementation((text: string) => {
            if (text.includes("FROM work_authors")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [updated] });
        });

        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Updated Title" }),
        });
        const res = await PUT(req, makeParams("1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ ...updated, authors: [] });
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

    it("returns 403 when user role is forbidden", async () => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "DELETE",
        });
        const res = await DELETE(req, makeParams("1"));
        expect(res.status).toBe(403);
    });
});

describe("Forbidden access tests", () => {
    beforeEach(() => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
    });

    it("GET /api/staff/works returns 403 for non-staff", async () => {
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(403);
    });

    it("POST /api/staff/works returns 403 for non-staff", async () => {
        const req = new NextRequest("http://localhost:3000/api/staff/works", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Test" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(403);
    });

    it("GET /api/staff/works/[id] returns 403 for non-staff", async () => {
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "GET",
        });
        const res = await GET_ONE(req, makeParams("1"));
        expect(res.status).toBe(403);
    });

    it("PUT /api/staff/works/[id] returns 403 for non-staff", async () => {
        const req = new NextRequest("http://localhost:3000/api/staff/works/1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Updated" }),
        });
        const res = await PUT(req, makeParams("1"));
        expect(res.status).toBe(403);
    });
});

describe("500 error handling", () => {
    it("GET /api/staff/works returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(500);
    });

    it("POST /api/staff/works returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = new NextRequest("http://localhost:3000/api/staff/works", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Test" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(500);
    });
});
