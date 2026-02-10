/**
 * @jest-environment node
 */

// Mock next/headers since it's not available outside Next.js runtime
const mockGet = jest.fn();
const mockCookies = jest.fn(() => ({ get: mockGet }));
jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

// Mock database
const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
  query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  getCurrentUser,
} from "@/lib/auth";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("auth", () => {
  describe("hashPassword", () => {
    it("returns a string with salt and hash separated by colon", async () => {
      const hash = await hashPassword("test123");
      expect(hash).toContain(":");
      const [salt, key] = hash.split(":");
      expect(salt).toHaveLength(32); // 16 bytes hex = 32 chars
      expect(key).toHaveLength(128); // 64 bytes hex = 128 chars
    });

    it("produces different hashes for the same password", async () => {
      const hash1 = await hashPassword("test123");
      const hash2 = await hashPassword("test123");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("returns true for a correct password", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("mypassword", hash);
      expect(result).toBe(true);
    });

    it("returns false for an incorrect password", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("wrongpassword", hash);
      expect(result).toBe(false);
    });

    it("returns false for a malformed hash", async () => {
      const result = await verifyPassword("test", "nocolon");
      expect(result).toBe(false);
    });

    it("returns false for an empty hash", async () => {
      const result = await verifyPassword("test", "");
      expect(result).toBe(false);
    });
  });

  describe("createSession", () => {
    it("inserts a session and returns the id", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: "session-123" }] });

      const result = await createSession("user-456");

      expect(result).toBe("session-123");
      expect(mockQuery).toHaveBeenCalledWith(
        "INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING id",
        ["user-456", expect.any(Date)]
      );
    });
  });

  describe("deleteSession", () => {
    it("deletes a session by id", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await deleteSession("session-123");

      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM sessions WHERE id = $1",
        ["session-123"]
      );
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when no session cookie exists", async () => {
      mockGet.mockReturnValue(undefined);

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it("returns null when session is expired or not found", async () => {
      mockGet.mockReturnValue({ value: "session-123" });
      mockQuery.mockResolvedValue({ rows: [] });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it("returns the user when a valid session exists", async () => {
      const mockUser = {
        id: "user-456",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockGet.mockReturnValue({ value: "session-123" });
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("JOIN sessions"),
        ["session-123"]
      );
    });
  });
});
