/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
const mockVerifyPassword = jest.fn();
const mockHashPassword = jest.fn();
jest.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  verifyPassword: (pw: string, hash: string) => mockVerifyPassword(pw, hash),
  hashPassword: (pw: string) => mockHashPassword(pw),
}));

const mockFindUserByEmail = jest.fn();
const mockUpdatePasswordHash = jest.fn();
jest.mock("@/lib/data/users", () => ({
  findUserByEmail: (email: string) => mockFindUserByEmail(email),
  updatePasswordHash: (userId: string, hash: string) => mockUpdatePasswordHash(userId, hash),
}));

import { POST } from "@/app/api/auth/change-password/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sessionUser = {
  id: "user-123",
  email: "user@example.com",
  name: "Test User",
  role: "user" as const,
};

const userRow = {
  id: "user-123",
  email: "user@example.com",
  name: "Test User",
  role: "user",
  password_hash: "current-hashed-password",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(sessionUser);
  mockFindUserByEmail.mockResolvedValue(userRow);
  mockVerifyPassword.mockResolvedValue(true);
  mockHashPassword.mockResolvedValue("new-hashed-password");
  mockUpdatePasswordHash.mockResolvedValue(undefined);
});

describe("POST /api/auth/change-password", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ currentPassword: "OldP@ss1", newPassword: "NewP@ss1word" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("Unauthorized");
  });

  it("returns 400 when currentPassword is missing", async () => {
    const res = await POST(makeRequest({ newPassword: "NewP@ss1word" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when newPassword is missing", async () => {
    const res = await POST(makeRequest({ currentPassword: "OldP@ss1" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when current password is incorrect", async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const res = await POST(makeRequest({ currentPassword: "WrongP@ss1", newPassword: "NewP@ss1word" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Current password is incorrect");
  });

  it("returns 400 when new password does not meet requirements", async () => {
    const res = await POST(makeRequest({ currentPassword: "OldP@ss1", newPassword: "weak" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("does not meet requirements");
    expect(body.errors).toBeDefined();
  });

  it("updates password hash on valid request", async () => {
    const res = await POST(makeRequest({ currentPassword: "OldP@ss1!", newPassword: "NewP@ss1word!" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("updated");
    expect(mockHashPassword).toHaveBeenCalledWith("NewP@ss1word!");
    expect(mockUpdatePasswordHash).toHaveBeenCalledWith("user-123", "new-hashed-password");
  });

  it("verifies current password against stored hash", async () => {
    await POST(makeRequest({ currentPassword: "OldP@ss1!", newPassword: "NewP@ss1word!" }));

    expect(mockVerifyPassword).toHaveBeenCalledWith("OldP@ss1!", "current-hashed-password");
  });

  it("returns 500 on database error", async () => {
    mockFindUserByEmail.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ currentPassword: "OldP@ss1!", newPassword: "NewP@ss1word!" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Internal server error");
  });
});
