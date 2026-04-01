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

const mockSendVerificationEmail = jest.fn();
jest.mock("@/lib/email", () => ({
  sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
}));

import { POST } from "@/app/api/auth/resend-verification/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateVerificationToken.mockResolvedValue("token-uuid-xyz");
  mockSendVerificationEmail.mockResolvedValue(true);
});

describe("POST /api/auth/resend-verification", () => {
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
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns 200 without sending email when user is already verified (anti-enumeration)", async () => {
    mockFindUserByEmail.mockResolvedValue({
      id: "user-123",
      email: "verified@example.com",
      name: "Verified User",
      email_verified_at: "2024-01-01T00:00:00Z",
    });

    const res = await POST(makeRequest({ email: "verified@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreateVerificationToken).not.toHaveBeenCalled();
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it("creates token and sends email for unverified user", async () => {
    mockFindUserByEmail.mockResolvedValue({
      id: "user-123",
      email: "unverified@example.com",
      name: "Unverified User",
      email_verified_at: null,
    });

    const res = await POST(makeRequest({ email: "unverified@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreateVerificationToken).toHaveBeenCalledWith(
      "user-123",
      "email_verification",
      expect.any(Date)
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "unverified@example.com",
      "Unverified User",
      expect.stringContaining("token-uuid-xyz")
    );
  });

  it("returns 500 on database error", async () => {
    mockFindUserByEmail.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ email: "user@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Internal server error");
  });
});
