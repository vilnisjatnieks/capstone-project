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

import { GET, POST, DELETE } from "@/app/api/works/[id]/hold/route";
import { NextRequest } from "next/server";

const regularUser = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
};

function makeParams(id: string) {
    return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(regularUser);
});

// ─── GET /api/works/[id]/hold ─────────────────────────────────────

describe("GET /api/works/[id]/hold", () => {
    it("returns hold when it exists", async () => {
        const hold = {
            id: "h1",
            work_id: "w1",
            user_id: "user-1",
            user_name: "User",
            created_at: "2026-01-01",
        };
        mockQuery.mockResolvedValue({ rows: [hold] });

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "GET" }
        );
        const res = await GET(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.hold).toEqual(hold);
    });

    it("returns null when no hold exists", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "GET" }
        );
        const res = await GET(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.hold).toBeNull();
    });
});

// ─── POST /api/works/[id]/hold ────────────────────────────────────

describe("POST /api/works/[id]/hold", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "POST" }
        );
        const res = await POST(req, makeParams("w1"));
        expect(res.status).toBe(401);
    });

    it("returns 404 when work not found", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // work lookup

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "POST" }
        );
        const res = await POST(req, makeParams("w1"));
        expect(res.status).toBe(404);
    });

    it("returns 409 when work is already on hold", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "h1" }] }); // existing hold

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "POST" }
        );
        const res = await POST(req, makeParams("w1"));
        expect(res.status).toBe(409);
    });

    it("returns 409 when user already has a hold", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no hold on work
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "h2" }] }); // user has hold

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "POST" }
        );
        const res = await POST(req, makeParams("w1"));
        expect(res.status).toBe(409);
    });

    it("creates a hold successfully", async () => {
        const newHold = {
            id: "h1",
            work_id: "w1",
            user_id: "user-1",
            created_at: "2026-01-01",
        };
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no hold on work
        mockQuery.mockResolvedValueOnce({ rows: [] }); // user has no hold
        mockQuery.mockResolvedValueOnce({ rows: [newHold] }); // insert

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "POST" }
        );
        const res = await POST(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.hold).toEqual({
            ...newHold,
            user_name: "User",
        });
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "POST" }
        );
        const res = await POST(req, makeParams("w1"));
        expect(res.status).toBe(500);
    });
});

// ─── DELETE /api/works/[id]/hold ──────────────────────────────────

describe("DELETE /api/works/[id]/hold", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));
        expect(res.status).toBe(401);
    });

    it("returns 404 when hold not found", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // hold lookup

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));
        expect(res.status).toBe(404);
    });

    it("returns 403 when user is not owner and not staff", async () => {
        const otherUser = { ...regularUser, id: "user-2" };
        mockGetCurrentUser.mockResolvedValue(otherUser);
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: "h1", user_id: "user-1" }],
        }); // hold belongs to user-1

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));
        expect(res.status).toBe(403);
    });

    it("returns 204 when hold is deleted by owner", async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: "h1", user_id: "user-1" }],
        }); // hold lookup
        mockQuery.mockResolvedValueOnce({ rows: [] }); // delete

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));

        expect(res.status).toBe(204);
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/hold",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));
        expect(res.status).toBe(500);
    });
});
