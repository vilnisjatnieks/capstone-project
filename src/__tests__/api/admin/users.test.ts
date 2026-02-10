/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
const mockHashPassword = jest.fn();
jest.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  hashPassword: (pw: string) => mockHashPassword(pw),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
  query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import { GET, POST } from "@/app/api/admin/users/route";
import { PUT, DELETE } from "@/app/api/admin/users/[id]/route";
import { NextRequest } from "next/server";

const adminUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: "admin",
};

function makeRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/users", {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(adminUser);
  mockHashPassword.mockResolvedValue("hashed-password");
});

describe("GET /api/admin/users", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...adminUser, role: "user" });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns all users", async () => {
    const users = [
      { id: "1", email: "a@b.com", name: "A", role: "admin" },
      { id: "2", email: "c@d.com", name: "C", role: "user" },
    ];
    mockQuery.mockResolvedValue({ rows: users });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(users);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SELECT"),
      undefined
    );
  });
});

describe("POST /api/admin/users", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "a@b.com", name: "A", password: "123" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ email: "a@b.com" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 409 when email already exists", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "existing" }] });

    const res = await POST(
      makeRequest({ email: "a@b.com", name: "A", password: "pass123" })
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("already in use");
  });

  it("creates a user successfully", async () => {
    const newUser = {
      id: "new-1",
      email: "new@example.com",
      name: "New User",
      role: "user",
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // email uniqueness check
      .mockResolvedValueOnce({ rows: [newUser] }); // insert

    const res = await POST(
      makeRequest({
        email: "new@example.com",
        name: "New User",
        password: "pass123",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(newUser);
    expect(mockHashPassword).toHaveBeenCalledWith("pass123");
  });

  it("defaults role to user", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "1" }] });

    await POST(
      makeRequest({
        email: "new@example.com",
        name: "New",
        password: "pass123",
      })
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT"),
      expect.arrayContaining(["user"])
    );
  });
});

describe("PUT /api/admin/users/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PUT(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no fields provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PUT(req, makeParams("user-2"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("At least one field");
  });

  it("blocks self-role-change", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user" }),
    });
    const res = await PUT(req, makeParams("admin-1"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("own role");
  });

  it("returns 409 when email already in use by another user", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "other" }] });
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "taken@example.com" }),
    });
    const res = await PUT(req, makeParams("user-2"));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toContain("already in use");
  });

  it("updates a user successfully", async () => {
    const updated = {
      id: "user-2",
      email: "updated@example.com",
      name: "Updated",
      role: "staff",
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // email uniqueness check
      .mockResolvedValueOnce({ rows: [updated] }); // update

    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "updated@example.com", name: "Updated", role: "staff" }),
    });
    const res = await PUT(req, makeParams("user-2"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(updated);
  });

  it("hashes password when included in update", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "user-2", name: "U" }] });

    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "newpass123" }),
    });
    const res = await PUT(req, makeParams("user-2"));

    expect(res.status).toBe(200);
    expect(mockHashPassword).toHaveBeenCalledWith("newpass123");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("password_hash"),
      expect.arrayContaining(["hashed-password"])
    );
  });

  it("returns 404 when user not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PUT(req, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("blocks self-deletion", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("admin-1"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("own account");
  });

  it("deletes a user successfully", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "user-2" }] });
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("user-2"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 404 when user not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const req = new NextRequest("http://localhost:3000/api/admin/users/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });
});
