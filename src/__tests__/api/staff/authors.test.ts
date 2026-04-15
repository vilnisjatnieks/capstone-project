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

import { GET, POST } from "@/app/api/staff/authors/route";
import {
    GET as GET_ONE,
    PATCH,
    DELETE,
} from "@/app/api/staff/authors/[id]/route";
import { NextRequest } from "next/server";

const staffUser = { id: "s1", email: "s@x.com", name: "S", role: "staff" };
const regularUser = { id: "u1", email: "u@x.com", name: "U", role: "user" };

function makeRequest(url: string, body?: Record<string, unknown>, method = "GET") {
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

describe("GET /api/staff/authors", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET(makeRequest("http://localhost/api/staff/authors?q=j"));
        expect(res.status).toBe(401);
    });

    it("returns 403 when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        const res = await GET(makeRequest("http://localhost/api/staff/authors?q=j"));
        expect(res.status).toBe(403);
    });

    it("returns matches on search", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "a1", name: "Jane", sort_name: null, created_at: "t" }],
        });
        const res = await GET(makeRequest("http://localhost/api/staff/authors?q=jane"));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(1);
        expect(body[0].name).toBe("Jane");
    });
});

describe("POST /api/staff/authors", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await POST(
            makeRequest("http://localhost/api/staff/authors", { name: "Jane" }, "POST")
        );
        expect(res.status).toBe(401);
    });

    it("returns 400 when name missing", async () => {
        const res = await POST(
            makeRequest("http://localhost/api/staff/authors", { sort_name: "x" }, "POST")
        );
        expect(res.status).toBe(400);
    });

    it("creates an author", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] }) // dedupe lookup
            .mockResolvedValueOnce({
                rows: [{ id: "a1", name: "Jane", sort_name: null, created_at: "t" }],
            });
        const res = await POST(
            makeRequest("http://localhost/api/staff/authors", { name: "Jane" }, "POST")
        );
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.id).toBe("a1");
    });

    it("returns existing author when name matches case-insensitively", async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: "a1", name: "Jane", sort_name: null, created_at: "t" }],
        });
        const res = await POST(
            makeRequest("http://localhost/api/staff/authors", { name: "jane" }, "POST")
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.id).toBe("a1");
    });
});

describe("GET /api/staff/authors/[id]", () => {
    it("returns 404 when not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const res = await GET_ONE(
            makeRequest("http://localhost/api/staff/authors/a1"),
            makeParams("a1")
        );
        expect(res.status).toBe(404);
    });

    it("returns author with works", async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{ id: "a1", name: "Jane", sort_name: null, created_at: "t" }],
            })
            .mockResolvedValueOnce({
                rows: [
                    { id: "w1", title: "Book A", date_published: null, publisher: null, role: "author" },
                ],
            });
        const res = await GET_ONE(
            makeRequest("http://localhost/api/staff/authors/a1"),
            makeParams("a1")
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.works).toHaveLength(1);
    });
});

describe("PATCH /api/staff/authors/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await PATCH(
            makeRequest("http://localhost/api/staff/authors/a1", { name: "X" }, "PATCH"),
            makeParams("a1")
        );
        expect(res.status).toBe(401);
    });

    it("returns 400 when name blank", async () => {
        const res = await PATCH(
            makeRequest("http://localhost/api/staff/authors/a1", { name: "  " }, "PATCH"),
            makeParams("a1")
        );
        expect(res.status).toBe(400);
    });

    it("updates an author", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "a1", name: "New", sort_name: null, created_at: "t" }],
        });
        const res = await PATCH(
            makeRequest("http://localhost/api/staff/authors/a1", { name: "New" }, "PATCH"),
            makeParams("a1")
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.name).toBe("New");
    });

    it("returns 404 when author not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const res = await PATCH(
            makeRequest("http://localhost/api/staff/authors/a1", { name: "X" }, "PATCH"),
            makeParams("a1")
        );
        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/staff/authors/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await DELETE(
            makeRequest("http://localhost/api/staff/authors/a1", undefined, "DELETE"),
            makeParams("a1")
        );
        expect(res.status).toBe(401);
    });

    it("returns 404 when not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const res = await DELETE(
            makeRequest("http://localhost/api/staff/authors/a1", undefined, "DELETE"),
            makeParams("a1")
        );
        expect(res.status).toBe(404);
    });

    it("returns 409 when author has attached works", async () => {
        mockQuery.mockRejectedValue(
            new Error("update or delete on table violates foreign key constraint")
        );
        const res = await DELETE(
            makeRequest("http://localhost/api/staff/authors/a1", undefined, "DELETE"),
            makeParams("a1")
        );
        expect(res.status).toBe(409);
    });

    it("returns 200 when deleted", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "a1" }] });
        const res = await DELETE(
            makeRequest("http://localhost/api/staff/authors/a1", undefined, "DELETE"),
            makeParams("a1")
        );
        expect(res.status).toBe(200);
    });
});
