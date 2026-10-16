// tests/unit/checkout-validation.test.ts
import { validatePhoneNumber, validateDetails } from "../../src/lib/ordering/validation";

describe("Checkout Validation Utilities", () => {
  describe("validatePhoneNumber", () => {
    it("should return true for valid Philippine mobile numbers", () => {
      expect(validatePhoneNumber("0912 345 6789")).toBe(true);
      expect(validatePhoneNumber("09123456789")).toBe(true);
      expect(validatePhoneNumber("+63 912 345 6789")).toBe(true);
      expect(validatePhoneNumber("+639123456789")).toBe(true);
    });

    it("should return false for invalid phone numbers", () => {
      expect(validatePhoneNumber("abcdefghij")).toBe(false);
      expect(validatePhoneNumber("091234")).toBe(false);
      expect(validatePhoneNumber("091234567890123")).toBe(false);
      expect(validatePhoneNumber("12345678901")).toBe(false);
    });
  });

  describe("validateDetails", () => {
    it("should pass when name and phone are valid", () => {
      const result = validateDetails({
        name: "Shan Besto",
        phone: "0912 345 6789",
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should fail when name is empty", () => {
      const result = validateDetails({
        name: "",
        phone: "0912 345 6789",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe("Name is required.");
    });

    it("should fail when phone is invalid", () => {
      const result = validateDetails({
        name: "Shan Besto",
        phone: "invalid-phone",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBeDefined();
    });
  });
});