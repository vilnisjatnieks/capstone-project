/**
 * @jest-environment node
 */

const mockHashPassword = jest.fn();
const mockCreateSession = jest.fn();
jest.mock("@/lib/auth", () => ({
  hashPassword: (pw: string) => mockHashPassword(pw),
  createSession: (userId: string) => mockCreateSession(userId),
}));

const mockCookies = {
  set: jest.fn(),
};
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => mockCookies),
}));

const mockFindUserByEmail = jest.fn();
const mockRegisterUser = jest.fn();
jest.mock("@/lib/data/users", () => ({
  findUserByEmail: (email: string) => mockFindUserByEmail(email),
  registerUser: (email: string, name: string, passwordHash: string) =>
    mockRegisterUser(email, name, passwordHash),
}));

import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHashPassword.mockResolvedValue("hashed-password");
  mockCreateSession.mockResolvedValue("session-id-123");
});

describe("POST /api/auth/register", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "MyP@ssw0rd1", name: "John" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "test@example.com", name: "John" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ email: "test@example.com", password: "MyP@ssw0rd1" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await POST(makeRequest({
      email: "notanemail",
      password: "MyP@ssw0rd1",
      name: "John"
    }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid email format");
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({
      email: "test@example.com",
      password: "Short1!",
      name: "John"
    }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("does not meet requirements");
    expect(body.errors).toContain("Password must be at least 8 characters long");
  });

  it("returns 400 when password missing uppercase", async () => {
    const res = await POST(makeRequest({
      email: "test@example.com",
      password: "myp@ssw0rd1",
      name: "John"
    }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("does not meet requirements");
    expect(body.errors).toContain("Password must contain at least one uppercase letter");
  });

  it("returns 400 when password missing number", async () => {
    const res = await POST(makeRequest({
      email: "test@example.com",
      password: "MyP@ssword",
      name: "John"
    }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("does not meet requirements");
    expect(body.errors).toContain("Password must contain at least one number");
  });

  it("returns 400 when password missing special character", async () => {
    const res = await POST(makeRequest({
      email: "test@example.com",
      password: "MyPassword1",
      name: "John"
    }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("does not meet requirements");
    expect(body.errors).toContain("Password must contain at least one special character");
  });

  it("returns 409 when email already exists", async () => {
    mockFindUserByEmail.mockResolvedValue({ id: "existing-user", email: "existing@example.com" });

    const res = await POST(makeRequest({
      email: "existing@example.com",
      password: "MyP@ssw0rd1",
      name: "John"
    }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("Email already registered");
  });

  it("creates user successfully with valid data", async () => {
    const newUser = {
      id: "user-123",
      email: "new@example.com",
      name: "John Doe",
      role: "user",
    };

    mockFindUserByEmail.mockResolvedValue(null);
    mockRegisterUser.mockResolvedValue(newUser);

    const res = await POST(makeRequest({
      email: "new@example.com",
      password: "MyP@ssw0rd1",
      name: "John Doe"
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user).toEqual(newUser);
    expect(mockHashPassword).toHaveBeenCalledWith("MyP@ssw0rd1");
  });

  it("creates session and sets cookie after registration", async () => {
    const newUser = {
      id: "user-123",
      email: "new@example.com",
      name: "John Doe",
      role: "user",
    };

    mockFindUserByEmail.mockResolvedValue(null);
    mockRegisterUser.mockResolvedValue(newUser);

    await POST(makeRequest({
      email: "new@example.com",
      password: "MyP@ssw0rd1",
      name: "John Doe"
    }));

    expect(mockCreateSession).toHaveBeenCalledWith("user-123");
    expect(mockCookies.set).toHaveBeenCalledWith("session_id", "session-id-123", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  });

  it("does not expose password_hash in response", async () => {
    const newUser = {
      id: "user-123",
      email: "new@example.com",
      name: "John Doe",
      role: "user",
    };

    mockFindUserByEmail.mockResolvedValue(null);
    mockRegisterUser.mockResolvedValue(newUser);

    const res = await POST(makeRequest({
      email: "new@example.com",
      password: "MyP@ssw0rd1",
      name: "John Doe"
    }));
    const body = await res.json();

    expect(body.user).not.toHaveProperty("password_hash");
  });

  it("returns 500 on database error", async () => {
    mockFindUserByEmail.mockRejectedValue(new Error("Database error"));

    const res = await POST(makeRequest({
      email: "new@example.com",
      password: "MyP@ssw0rd1",
      name: "John Doe"
    }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Internal server error");
  });
});
