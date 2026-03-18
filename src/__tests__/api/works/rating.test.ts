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

const mockHasReturnedCheckout = jest.fn();
jest.mock("@/lib/data/checkouts", () => ({
    hasReturnedCheckout: (userId: string, workId: string) =>
        mockHasReturnedCheckout(userId, workId),
}));

import { GET, PUT, DELETE } from "@/app/api/works/[id]/rating/route";
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

function makeRequest(
    url: string,
    body?: Record<string, unknown>,
    method = "PUT"
): NextRequest {
    return new NextRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(regularUser);
    mockHasReturnedCheckout.mockResolvedValue(true);
});

// ─── GET /api/works/[id]/rating ────────────────────────────────────

describe("GET /api/works/[id]/rating", () => {
    it("returns null rating when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/rating",
            { method: "GET" }
        );
        const res = await GET(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.rating).toBeNull();
    });

    it("returns user rating when authenticated", async () => {
        const rating = {
            id: "r1",
            work_id: "w1",
            user_id: "user-1",
            rating: 4,
        };
        mockQuery.mockResolvedValue({ rows: [rating] });

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/rating",
            { method: "GET" }
        );
        const res = await GET(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.rating).toEqual(rating);
    });

    it("returns null when user has no rating", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/rating",
            { method: "GET" }
        );
        const res = await GET(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.rating).toBeNull();
    });
});

// ─── PUT /api/works/[id]/rating ────────────────────────────────────

describe("PUT /api/works/[id]/rating", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = makeRequest(
            "http://localhost:3000/api/works/w1/rating",
            { rating: 4 }
        );
        const res = await PUT(req, makeParams("w1"));
        expect(res.status).toBe(401);
    });

    it("returns 400 for invalid rating", async () => {
        const req = makeRequest(
            "http://localhost:3000/api/works/w1/rating",
            { rating: 6 }
        );
        const res = await PUT(req, makeParams("w1"));
        expect(res.status).toBe(400);
    });

    it("returns 403 when user has not returned the book", async () => {
        mockHasReturnedCheckout.mockResolvedValue(false);
        const req = makeRequest(
            "http://localhost:3000/api/works/w1/rating",
            { rating: 4 }
        );
        const res = await PUT(req, makeParams("w1"));
        expect(res.status).toBe(403);
    });

    it("creates a rating successfully", async () => {
        const newRating = {
            id: "r1",
            work_id: "w1",
            user_id: "user-1",
            rating: 4,
        };
        mockQuery.mockResolvedValue({ rows: [newRating] });

        const req = makeRequest(
            "http://localhost:3000/api/works/w1/rating",
            { rating: 4 }
        );
        const res = await PUT(req, makeParams("w1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.rating).toEqual(newRating);
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = makeRequest(
            "http://localhost:3000/api/works/w1/rating",
            { rating: 4 }
        );
        const res = await PUT(req, makeParams("w1"));
        expect(res.status).toBe(500);
    });
});

// ─── DELETE /api/works/[id]/rating ─────────────────────────────────

describe("DELETE /api/works/[id]/rating", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/rating",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));
        expect(res.status).toBe(401);
    });

    it("returns 204 when rating is deleted", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "r1" }] });

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/rating",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));

        expect(res.status).toBe(204);
    });

    it("returns 404 when rating not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/rating",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));

        expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue("unexpected");
        const req = new NextRequest(
            "http://localhost:3000/api/works/w1/rating",
            { method: "DELETE" }
        );
        const res = await DELETE(req, makeParams("w1"));
        expect(res.status).toBe(500);
    });
});
