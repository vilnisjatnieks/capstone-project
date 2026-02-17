/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
jest.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { requireAdmin } from "@/lib/admin";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireAdmin", () => {
  it("returns 401 when no user is logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const body = await result.response.json();
      expect(result.response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    }
  });

  it("returns 403 when user is not an admin", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "Regular User",
      role: "user",
    });

    const result = await requireAdmin();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const body = await result.response.json();
      expect(result.response.status).toBe(403);
      expect(body.error).toBe("Forbidden");
    }
  });

  it("returns 403 when user is staff", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-2",
      email: "staff@example.com",
      name: "Staff User",
      role: "staff",
    });

    const result = await requireAdmin();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns authorized with user when user is admin", async () => {
    const adminUser = {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
    };
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const result = await requireAdmin();

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.user).toEqual(adminUser);
    }
  });
});
