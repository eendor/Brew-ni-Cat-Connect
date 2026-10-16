// src/lib/ordering/validation.ts

/**
 * Regex for Philippine mobile numbers.
 * Validates formats such as:
 * - 0912 345 6789 or 09123456789
 * - +63 912 345 6789 or +639123456789
 */
const PH_MOBILE_REGEX = /^(?:\+63\s?|0)9\d{2}[- ]?\d{3}[- ]?\d{4}$/;

export interface CheckoutDetails {
  name: string;
  phone: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    phone?: string;
  };
}

/**
 * Validates a Philippine mobile phone number.
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.trim();
  return PH_MOBILE_REGEX.test(cleaned);
}

/**
 * Validates checkout form details (Name and Phone Number).
 */
export function validateDetails(details: CheckoutDetails): ValidationResult {
  const errors: { name?: string; phone?: string } = {};

  if (!details.name || details.name.trim().length === 0) {
    errors.name = "Name is required.";
  }

  if (!details.phone || details.phone.trim().length === 0) {
    errors.phone = "Phone number is required.";
  } else if (!validatePhoneNumber(details.phone)) {
    errors.phone = "Please enter a valid Philippine mobile number (e.g., 0912 345 6789 or +63 912 345 6789).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}