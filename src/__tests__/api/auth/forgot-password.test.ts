/**
 * @jest-environment node
 */

const mockFindUserByEmail = jest.fn();
jest.mock("@/lib/data/users", () => ({
  findUserByEmail: (email: string) => mockFindUserByEmail(email),
}));

const mockCreateVerificationToken = jest.fn();
jest.mock("@/lib/data/verification-tokens", () => ({
  createVerificationToken: (...args: unknown[]) => mockCreateVerificationToken(...args),
}));

const mockSendPasswordResetEmail = jest.fn();
jest.mock("@/lib/email", () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
}));

import { POST } from "@/app/api/auth/forgot-password/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateVerificationToken.mockResolvedValue("reset-token-uuid");
  mockSendPasswordResetEmail.mockResolvedValue(true);
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Email is required");
  });

  it("returns 200 when user is not found (anti-enumeration)", async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "nobody@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBeDefined();
    expect(mockCreateVerificationToken).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates password_reset token and sends email when user exists", async () => {
    mockFindUserByEmail.mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
    });

    const res = await POST(makeRequest({ email: "user@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreateVerificationToken).toHaveBeenCalledWith(
      "user-123",
      "password_reset",
      expect.any(Date)
    );
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      "user@example.com",
      "Test User",
      expect.stringContaining("reset-token-uuid")
    );
    expect(body.message).toBeDefined();
  });

  it("reset URL points to /reset-password", async () => {
    mockFindUserByEmail.mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
    });

    await POST(makeRequest({ email: "user@example.com" }));

    const resetUrl = mockSendPasswordResetEmail.mock.calls[0][2] as string;
    expect(resetUrl).toContain("/reset-password?token=reset-token-uuid");
  });

  it("returns 500 on database error", async () => {
    mockFindUserByEmail.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ email: "user@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Internal server error");
  });
});
