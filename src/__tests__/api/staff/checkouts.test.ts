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

import { GET, POST } from "@/app/api/staff/checkouts/route";
import { GET as GET_ONE, PUT } from "@/app/api/staff/checkouts/[id]/route";
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
    return new NextRequest("http://localhost:3000/api/staff/checkouts", {
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

// ─── GET /api/staff/checkouts ───────────────────────────────────────

function makeGetRequest(qs = ""): NextRequest {
    return new NextRequest(`http://localhost:3000/api/staff/checkouts${qs}`, {
        method: "GET",
    });
}

describe("GET /api/staff/checkouts", () => {
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

    it("returns paginated checkouts for staff", async () => {
        const checkouts = [
            { id: "c1", work_title: "Book A", user_name: "Alice", total_count: "2" },
            { id: "c2", work_title: "Book B", user_name: "Bob", total_count: "2" },
        ];
        mockQuery.mockResolvedValue({ rows: checkouts });

        const res = await GET(makeGetRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            items: [
                { id: "c1", work_title: "Book A", user_name: "Alice" },
                { id: "c2", work_title: "Book B", user_name: "Bob" },
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
        const res = await GET(makeGetRequest("?page=2&pageSize=5"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ items: [], total: 0, page: 2, pageSize: 5 });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("LIMIT"),
            [5, 5]
        );
    });

    it("returns all checkouts for admin", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        mockQuery.mockResolvedValue({ rows: [] });

        const res = await GET(makeGetRequest());
        expect(res.status).toBe(200);
    });
});

// ─── POST /api/staff/checkouts ──────────────────────────────────────

describe("POST /api/staff/checkouts", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await POST(
            makeRequest({ work_id: "w1", user_id: "u1", due_date: "2026-03-01" })
        );
        expect(res.status).toBe(401);
    });

    it("returns 400 when required fields are missing", async () => {
        const res = await POST(makeRequest({ work_id: "w1" }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("required");
    });

    it("returns 404 when work does not exist", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // work lookup

        const res = await POST(
            makeRequest({ work_id: "w1", user_id: "u1", due_date: "2026-03-01" })
        );
        const body = await res.json();
        expect(res.status).toBe(404);
        expect(body.error).toContain("Work not found");
    });

    it("returns 404 when user does not exist", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // user lookup

        const res = await POST(
            makeRequest({ work_id: "w1", user_id: "u1", due_date: "2026-03-01" })
        );
        const body = await res.json();
        expect(res.status).toBe(404);
        expect(body.error).toContain("User not found");
    });

    it("returns 409 when work is already checked out", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "u1" }] }); // user exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "c1" }] }); // active checkout

        const res = await POST(
            makeRequest({ work_id: "w1", user_id: "u1", due_date: "2026-03-01" })
        );
        const body = await res.json();
        expect(res.status).toBe(409);
        expect(body.error).toContain("already checked out");
    });

    it("creates a checkout successfully", async () => {
        const newCheckout = {
            id: "c1",
            work_id: "w1",
            user_id: "u1",
            due_date: "2026-03-01",
            returned_at: null,
        };
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "u1" }] }); // user exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no active checkout
        mockQuery.mockResolvedValueOnce({ rows: [newCheckout] }); // insert

        const res = await POST(
            makeRequest({ work_id: "w1", user_id: "u1", due_date: "2026-03-01" })
        );
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toEqual(newCheckout);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT"),
            ["w1", "u1", "2026-03-01"]
        );
    });
});

// ─── GET /api/staff/checkouts/[id] ─────────────────────────────────

describe("GET /api/staff/checkouts/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            { method: "GET" }
        );
        const res = await GET_ONE(req, makeParams("c1"));
        expect(res.status).toBe(401);
    });

    it("returns 404 when checkout not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c999",
            { method: "GET" }
        );
        const res = await GET_ONE(req, makeParams("c999"));
        expect(res.status).toBe(404);
    });

    it("returns a single checkout", async () => {
        const checkout = { id: "c1", work_title: "Book A", user_name: "Alice" };
        mockQuery.mockResolvedValue({ rows: [checkout] });
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            { method: "GET" }
        );
        const res = await GET_ONE(req, makeParams("c1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(checkout);
    });
});

// ─── PUT /api/staff/checkouts/[id] (return) ────────────────────────

describe("PUT /api/staff/checkouts/[id]", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "return" }),
            }
        );
        const res = await PUT(req, makeParams("c1"));
        expect(res.status).toBe(401);
    });

    it("returns 400 for invalid action", async () => {
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "invalid" }),
            }
        );
        const res = await PUT(req, makeParams("c1"));
        expect(res.status).toBe(400);
    });

    it("returns a book successfully", async () => {
        const returned = {
            id: "c1",
            work_id: "w1",
            user_id: "u1",
            returned_at: "2026-02-17T00:00:00Z",
        };
        mockQuery.mockResolvedValue({ rows: [returned] });

        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "return" }),
            }
        );
        const res = await PUT(req, makeParams("c1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.returned_at).toBeTruthy();
    });

    it("returns 404 when checkout not found or already returned", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c999",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "return" }),
            }
        );
        const res = await PUT(req, makeParams("c999"));
        expect(res.status).toBe(404);
    });

    it("returns 403 when user role is forbidden", async () => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "return" }),
            }
        );
        const res = await PUT(req, makeParams("c1"));
        expect(res.status).toBe(403);
    });
});

describe("Forbidden access tests (checkouts)", () => {
    beforeEach(() => {
        mockGetCurrentUser.mockResolvedValue({ ...staffUser, role: "user" });
    });

    it("GET /api/staff/checkouts returns 403 for non-staff", async () => {
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(403);
    });

    it("POST /api/staff/checkouts returns 403 for non-staff", async () => {
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    work_id: "w1",
                    user_id: "u1",
                    due_date: "2026-03-01",
                }),
            }
        );
        const res = await POST(req);
        expect(res.status).toBe(403);
    });

    it("GET /api/staff/checkouts/[id] returns 403 for non-staff", async () => {
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            { method: "GET" }
        );
        const res = await GET_ONE(req, makeParams("c1"));
        expect(res.status).toBe(403);
    });
});

describe("500 error handling (checkouts)", () => {
    it("GET /api/staff/checkouts returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const res = await GET(makeGetRequest());
        expect(res.status).toBe(500);
    });

    it("POST /api/staff/checkouts returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    work_id: "w1",
                    user_id: "u1",
                    due_date: "2026-03-01",
                }),
            }
        );
        const res = await POST(req);
        expect(res.status).toBe(500);
    });

    it("GET /api/staff/checkouts/[id] returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            { method: "GET" }
        );
        const res = await GET_ONE(req, makeParams("c1"));
        expect(res.status).toBe(500);
    });

    it("PUT /api/staff/checkouts/[id] returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = new NextRequest(
            "http://localhost:3000/api/staff/checkouts/c1",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "return" }),
            }
        );
        const res = await PUT(req, makeParams("c1"));
        expect(res.status).toBe(500);
    });
});
