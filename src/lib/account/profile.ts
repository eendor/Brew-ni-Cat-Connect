/**
 * Customer profile data service (FR-038).
 *
 * Handles fetching, validating, and updating customer profiles in `public.customer_profiles`.
 * Validates full name and phone number against `src/lib/ordering/validation.ts`.
 * Normalizes phone numbers to `+639XXXXXXXXX` format prior to persistence to comply
 * with the database check constraint `phone ~ '^\+639[0-9]{9}$'`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DETAILS_ERROR_MESSAGES,
  normalizePhoneNumber,
  validatePhoneNumber,
} from "@/lib/ordering/validation";
import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";

export const MAX_PROFILE_NAME_LENGTH = 100;

export const PROFILE_ERROR_MESSAGES = {
  nameRequired: DETAILS_ERROR_MESSAGES.nameRequired,
  nameTooLong: `Please keep your name to ${MAX_PROFILE_NAME_LENGTH} characters or fewer.`,
  phoneRequired: DETAILS_ERROR_MESSAGES.phoneRequired,
  phoneInvalid: DETAILS_ERROR_MESSAGES.phoneInvalid,
  saveFailed: "We couldn't save your profile. Please try again.",
  loadFailed: "Unable to load profile. Please try again later.",
} as const;

export type CustomerProfile = Readonly<{
  userId: string;
  fullName: string;
  phone: string | null;
  createdAt?: string;
  updatedAt?: string;
}>;

export type CustomerProfileInput = Readonly<{
  fullName: string;
  phone: string;
}>;

export type ProfileValidationResult = Readonly<{
  isValid: boolean;
  errors: {
    fullName?: string;
    phone?: string;
  };
  normalized?: {
    fullName: string;
    phone: string;
  };
}>;

export function validateCustomerProfile(
  input: CustomerProfileInput,
): ProfileValidationResult {
  const errors: { fullName?: string; phone?: string } = {};

  const trimmedName = (input.fullName ?? "").trim();
  if (trimmedName.length === 0) {
    errors.fullName = PROFILE_ERROR_MESSAGES.nameRequired;
  } else if (trimmedName.length > MAX_PROFILE_NAME_LENGTH) {
    errors.fullName = PROFILE_ERROR_MESSAGES.nameTooLong;
  }

  const rawPhone = (input.phone ?? "").trim();
  if (rawPhone.length === 0) {
    errors.phone = PROFILE_ERROR_MESSAGES.phoneRequired;
  } else if (!validatePhoneNumber(rawPhone)) {
    errors.phone = PROFILE_ERROR_MESSAGES.phoneInvalid;
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    normalized: {
      fullName: trimmedName,
      phone: normalizePhoneNumber(rawPhone),
    },
  };
}

export type FetchProfileOptions = Readonly<{
  userId: string;
  client?: SupabaseClient;
}>;

export async function fetchCustomerProfile({
  userId,
  client,
}: FetchProfileOptions): Promise<CustomerProfile | null> {
  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase
    .from("customer_profiles")
    .select("user_id, full_name, phone, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    fullName: data.full_name,
    phone: data.phone,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export type SaveProfileOptions = Readonly<{
  userId: string;
  input: CustomerProfileInput;
  client?: SupabaseClient;
}>;

export type SaveProfileResult =
  | Readonly<{ ok: true; profile: CustomerProfile }>
  | Readonly<{
      ok: false;
      errors?: { fullName?: string; phone?: string };
      message: string;
    }>;

export async function saveCustomerProfile({
  userId,
  input,
  client,
}: SaveProfileOptions): Promise<SaveProfileResult> {
  const validation = validateCustomerProfile(input);
  if (!validation.isValid || !validation.normalized) {
    return {
      ok: false,
      errors: validation.errors,
      message: "Please fix the validation errors before saving.",
    };
  }

  const supabase = client ?? getAuthSupabaseClient();

  const { data, error } = await supabase
    .from("customer_profiles")
    .upsert({
      user_id: userId,
      full_name: validation.normalized.fullName,
      phone: validation.normalized.phone,
    })
    .select("user_id, full_name, phone, created_at, updated_at")
    .single();

  if (error) {
    return {
      ok: false,
      message: PROFILE_ERROR_MESSAGES.saveFailed,
    };
  }

  return {
    ok: true,
    profile: {
      userId: data.user_id,
      fullName: data.full_name,
      phone: data.phone,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}
