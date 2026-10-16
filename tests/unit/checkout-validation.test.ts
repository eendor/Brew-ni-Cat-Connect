import { describe, expect, it } from "vitest";
import {
  validatePhoneNumber,
  validateDetails,
} from "@/lib/ordering/validation";

describe("Checkout Validation Utilities", () => {
  describe("validatePhoneNumber", () => {
    it("should return true for valid Philippine mobile numbers", () => {
      expect(validatePhoneNumber("0912 345 6789")).toBe(true);
      expect(validatePhoneNumber("09123456789")).toBe(true);
      expect(validatePhoneNumber("+63 912 345 6789")).toBe(true);
      expect(validatePhoneNumber("+639123456789")).toBe(true);
    });

    it("should return false for invalid phone numbers", () => {
      expect(validatePhoneNumber("12345")).toBe(false);
      expect(validatePhoneNumber("abcdefghij")).toBe(false);
      expect(validatePhoneNumber("08123456789")).toBe(false);
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
      const result = validateDetails({ name: "", phone: "0912 345 6789" });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe("Please enter your full name.");
    });

    it("should fail when phone is empty", () => {
      const result = validateDetails({ name: "Shan Besto", phone: "" });
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe(
        "Please enter your contact phone number.",
      );
    });

    it("should fail when phone is invalid", () => {
      const result = validateDetails({ name: "Shan Besto", phone: "1234" });
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe(
        "Please enter a valid Philippine mobile number (e.g. 0912 345 6789 or +63 912 345 6789).",
      );
    });
  });
});
