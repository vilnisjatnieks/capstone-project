/**
 * @jest-environment node
 */

// Mock next/headers since it's not available outside Next.js runtime
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { hashPassword, verifyPassword } from "@/lib/auth";

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
});
