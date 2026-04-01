/**
 * @jest-environment node
 */

const mockVerifyPassword = jest.fn();
const mockCreateSession = jest.fn();
jest.mock("@/lib/auth", () => ({
  verifyPassword: (pw: string, hash: string) => mockVerifyPassword(pw, hash),
  createSession: (userId: string) => mockCreateSession(userId),
}));

const mockCookies = {
  set: jest.fn(),
};
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => mockCookies),
}));

const mockFindUserByEmail = jest.fn();
jest.mock("@/lib/data/users", () => ({
  findUserByEmail: (email: string) => mockFindUserByEmail(email),
}));

import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const verifiedUser = {
  id: "user-123",
  email: "user@example.com",
  name: "Test User",
  role: "user",
  password_hash: "hashed-password",
  email_verified_at: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateSession.mockResolvedValue("session-id-abc");
  mockVerifyPassword.mockResolvedValue(true);
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "MyP@ssw0rd1" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "user@example.com" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 401 when user is not found", async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "nobody@example.com", password: "MyP@ssw0rd1" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("Invalid email or password");
  });

  it("returns 401 when password is wrong", async () => {
    mockFindUserByEmail.mockResolvedValue(verifiedUser);
    mockVerifyPassword.mockResolvedValue(false);

    const res = await POST(makeRequest({ email: "user@example.com", password: "WrongPass1!" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("Invalid email or password");
  });

  it("returns 403 EMAIL_NOT_VERIFIED when email is not verified", async () => {
    const unverifiedUser = { ...verifiedUser, email_verified_at: null };
    mockFindUserByEmail.mockResolvedValue(unverifiedUser);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(makeRequest({ email: "user@example.com", password: "MyP@ssw0rd1" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("EMAIL_NOT_VERIFIED");
  });

  it("returns 200 with user on valid login", async () => {
    mockFindUserByEmail.mockResolvedValue(verifiedUser);

    const res = await POST(makeRequest({ email: "user@example.com", password: "MyP@ssw0rd1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toMatchObject({
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
      role: "user",
    });
  });

  it("creates session and sets cookie on valid login", async () => {
    mockFindUserByEmail.mockResolvedValue(verifiedUser);

    await POST(makeRequest({ email: "user@example.com", password: "MyP@ssw0rd1" }));

    expect(mockCreateSession).toHaveBeenCalledWith("user-123");
    expect(mockCookies.set).toHaveBeenCalledWith("session_id", "session-id-abc", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  });

  it("does not expose password_hash in response", async () => {
    mockFindUserByEmail.mockResolvedValue(verifiedUser);

    const res = await POST(makeRequest({ email: "user@example.com", password: "MyP@ssw0rd1" }));
    const body = await res.json();

    expect(body.user).not.toHaveProperty("password_hash");
  });

  it("returns 500 on database error", async () => {
    mockFindUserByEmail.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ email: "user@example.com", password: "MyP@ssw0rd1" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Internal server error");
  });
});
