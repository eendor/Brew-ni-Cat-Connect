// src/lib/ordering/validation.ts

/**
 * Validates Philippine mobile numbers.
 * Cleans spaces, hyphens, and parentheses first, then accepts 09XXXXXXXXX or +639XXXXXXXXX.
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-()]/g, "");
  return /^(09\d{9}|\+639\d{9})$/.test(cleanPhone);
}

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
 * Validates checkout form details (Name and Phone Number).
 * Matches live form error messages.
 */
export function validateDetails(details: CheckoutDetails): ValidationResult {
  const errors: { name?: string; phone?: string } = {};

  if (!details.name || details.name.trim().length === 0) {
    errors.name = "Please enter your full name.";
  }

  if (!details.phone || details.phone.trim().length === 0) {
    errors.phone = "Please enter your contact phone number.";
  } else if (!validatePhoneNumber(details.phone)) {
    errors.phone =
      "Please enter a valid Philippine mobile number (e.g. 0912 345 6789 or +63 912 345 6789).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
