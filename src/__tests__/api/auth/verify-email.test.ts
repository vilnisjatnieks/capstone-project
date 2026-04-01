/**
 * @jest-environment node
 */

const mockGetVerificationToken = jest.fn();
const mockDeleteVerificationToken = jest.fn();
jest.mock("@/lib/data/verification-tokens", () => ({
  getVerificationToken: (...args: unknown[]) => mockGetVerificationToken(...args),
  deleteVerificationToken: (token: string) => mockDeleteVerificationToken(token),
}));

const mockMarkEmailVerified = jest.fn();
jest.mock("@/lib/data/users", () => ({
  markEmailVerified: (userId: string) => mockMarkEmailVerified(userId),
}));

const mockCreateSession = jest.fn();
jest.mock("@/lib/auth", () => ({
  createSession: (userId: string) => mockCreateSession(userId),
}));

import { GET } from "@/app/api/auth/verify-email/route";
import { NextRequest } from "next/server";

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost:3000/api/auth/verify-email?token=${token}`
    : "http://localhost:3000/api/auth/verify-email";
  return new NextRequest(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateSession.mockResolvedValue("session-id-abc");
  mockMarkEmailVerified.mockResolvedValue(undefined);
  mockDeleteVerificationToken.mockResolvedValue(undefined);
});

describe("GET /api/auth/verify-email", () => {
  it("redirects to /verify-email?error=invalid when token is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/verify-email?error=invalid");
  });

  it("redirects to /verify-email?error=invalid when token is invalid", async () => {
    mockGetVerificationToken.mockResolvedValue(null);

    const res = await GET(makeRequest("bad-token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/verify-email?error=invalid");
  });

  it("redirects to / on valid token", async () => {
    mockGetVerificationToken.mockResolvedValue({ userId: "user-123" });

    const res = await GET(makeRequest("valid-token-uuid"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("marks email verified, deletes token, and creates session on valid token", async () => {
    mockGetVerificationToken.mockResolvedValue({ userId: "user-123" });

    await GET(makeRequest("valid-token-uuid"));

    expect(mockMarkEmailVerified).toHaveBeenCalledWith("user-123");
    expect(mockDeleteVerificationToken).toHaveBeenCalledWith("valid-token-uuid");
    expect(mockCreateSession).toHaveBeenCalledWith("user-123");
  });

  it("sets session cookie on valid token", async () => {
    mockGetVerificationToken.mockResolvedValue({ userId: "user-123" });

    const res = await GET(makeRequest("valid-token-uuid"));

    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toContain("session_id=session-id-abc");
    expect(setCookieHeader).toContain("HttpOnly");
  });

  it("redirects to /verify-email?error=invalid on DB error", async () => {
    mockGetVerificationToken.mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest("some-token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/verify-email?error=invalid");
  });
});
