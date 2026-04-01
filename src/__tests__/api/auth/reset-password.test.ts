/**
 * @jest-environment node
 */

const mockGetVerificationToken = jest.fn();
const mockDeleteVerificationToken = jest.fn();
jest.mock("@/lib/data/verification-tokens", () => ({
  getVerificationToken: (...args: unknown[]) => mockGetVerificationToken(...args),
  deleteVerificationToken: (token: string) => mockDeleteVerificationToken(token),
}));

const mockUpdatePasswordHash = jest.fn();
jest.mock("@/lib/data/users", () => ({
  updatePasswordHash: (userId: string, hash: string) => mockUpdatePasswordHash(userId, hash),
}));

const mockHashPassword = jest.fn();
jest.mock("@/lib/auth", () => ({
  hashPassword: (pw: string) => mockHashPassword(pw),
}));

import { POST } from "@/app/api/auth/reset-password/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHashPassword.mockResolvedValue("new-hashed-password");
  mockUpdatePasswordHash.mockResolvedValue(undefined);
  mockDeleteVerificationToken.mockResolvedValue(undefined);
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({ password: "NewP@ss1word" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ token: "some-token" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when token is invalid or expired", async () => {
    mockGetVerificationToken.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: "bad-token", password: "NewP@ss1word" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid or expired");
  });

  it("returns 400 when new password does not meet requirements", async () => {
    mockGetVerificationToken.mockResolvedValue({ userId: "user-123" });

    const res = await POST(makeRequest({ token: "valid-token", password: "weak" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("does not meet requirements");
    expect(body.errors).toBeDefined();
  });

  it("updates password and deletes token on valid request", async () => {
    mockGetVerificationToken.mockResolvedValue({ userId: "user-123" });

    const res = await POST(makeRequest({ token: "valid-token", password: "NewP@ss1word" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("updated");
    expect(mockHashPassword).toHaveBeenCalledWith("NewP@ss1word");
    expect(mockUpdatePasswordHash).toHaveBeenCalledWith("user-123", "new-hashed-password");
    expect(mockDeleteVerificationToken).toHaveBeenCalledWith("valid-token");
  });

  it("looks up token with password_reset type", async () => {
    mockGetVerificationToken.mockResolvedValue({ userId: "user-123" });

    await POST(makeRequest({ token: "valid-token", password: "NewP@ss1word" }));

    expect(mockGetVerificationToken).toHaveBeenCalledWith("valid-token", "password_reset");
  });

  it("returns 500 on database error", async () => {
    mockGetVerificationToken.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ token: "valid-token", password: "NewP@ss1word" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Internal server error");
  });
});
