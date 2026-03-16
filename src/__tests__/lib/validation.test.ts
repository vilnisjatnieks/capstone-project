import { validatePassword, validateEmail } from "@/lib/validation";

describe("validatePassword", () => {
  it("should validate a strong password", () => {
    const result = validatePassword("MyP@ssw0rd1");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject password that is too short", () => {
    const result = validatePassword("Abc1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long"
    );
  });

  it("should reject password without uppercase letter", () => {
    const result = validatePassword("myp@ssw0rd1");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter"
    );
  });

  it("should reject password without number", () => {
    const result = validatePassword("MyP@ssword");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
  });

  it("should reject password without special character", () => {
    const result = validatePassword("MyPassword1");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one special character"
    );
  });

  it("should return multiple errors for weak password", () => {
    const result = validatePassword("weak");
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long"
    );
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter"
    );
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
    expect(result.errors).toContain(
      "Password must contain at least one special character"
    );
  });

  it("should accept various special characters", () => {
    const specialChars = "!@#$%^&*()_+-=[]{};\':\"\\|,.<>/?";
    for (const char of specialChars) {
      const password = `Test123${char}`;
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
    }
  });

  it("should accept password at minimum length boundary", () => {
    const result = validatePassword("Abcd123!");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validateEmail", () => {
  it("should validate a correct email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("test.user@domain.co.uk")).toBe(true);
    expect(validateEmail("user+tag@example.com")).toBe(true);
  });

  it("should reject invalid email formats", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("user @example.com")).toBe(false);
    expect(validateEmail("user@domain")).toBe(false);
    expect(validateEmail("")).toBe(false);
  });
});
