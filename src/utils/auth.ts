import { RegistrationFormData, ResetPasswordData } from '../types';

export const SUPPORTED_COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳', placeholder: '98765 43210' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸', placeholder: '202 555 0123' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', placeholder: '7911 123456' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', placeholder: '50 123 4567' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', placeholder: '8123 4567' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', placeholder: '412 345 678' },
];

// Normalize any user phone string to strict E.164 format (+[countryCode][digits])
export function normalizePhoneNumber(phoneNumber: string, countryCode: string = '+91'): string {
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '').trim();
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  const cleanCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${cleanCode}${cleaned}`;
}

// Format masked phone number for display
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length <= 4) return phone;
  const last4 = phone.slice(-4);
  const prefix = phone.slice(0, Math.min(4, phone.length - 4));
  return `${prefix} ******${last4}`;
}

/**
 * Standard Email Validation
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Cryptographic Password Hashing using PBKDF2 with SHA-256 via Web Crypto API (SubtleCrypto)
 * Never stores plaintext passwords.
 */
export async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  if (!password) {
    throw new Error('Password cannot be empty');
  }

  const enc = new TextEncoder();
  let salt: Uint8Array;
  if (saltHex && saltHex.length === 32) {
    const matches = saltHex.match(/.{1,2}/g);
    const bytes = matches ? matches.map((b) => parseInt(b, 16)) : [];
    salt = new Uint8Array(bytes);
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const saltOut = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash: hashHex, salt: saltOut };
}

/**
 * Verify a candidate plaintext password against stored PBKDF2 hash and salt
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  if (!password || !storedHash || !storedSalt) return false;
  try {
    const { hash } = await hashPassword(password, storedSalt);
    return hash === storedHash;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Validate registration fields (Password-only, no OTP)
 * Required: fullName, email, password, confirmPassword
 * Optional: phone, enrollmentNumber, university, course, year, batch, room
 */
export function validateRegistration(data: RegistrationFormData): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Full name validation
  if (!data.fullName || !data.fullName.trim() || data.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name (at least 2 characters).';
  }

  // Email validation
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address (e.g. name@university.edu).';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required.';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  }

  // Confirm password validation
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // Optional Phone validation
  if (data.phoneNumber && data.phoneNumber.trim()) {
    const rawPhone = data.phoneNumber.replace(/[\s\-\(\)]/g, '');
    const code = data.countryCode || '+91';
    if (code === '+91' && !/^[6-9]\d{9}$/.test(rawPhone)) {
      errors.phoneNumber = 'Optional mobile number must be 10 digits starting with 6-9.';
    } else if (rawPhone.length < 7 || rawPhone.length > 15) {
      errors.phoneNumber = 'Phone number must be between 7 and 15 digits.';
    }
  }

  // Optional Student fields (if user explicitly enabled isStudent)
  if (data.isStudent) {
    if (data.enrollmentNumber && data.enrollmentNumber.trim().length > 30) {
      errors.enrollmentNumber = 'Enrollment number is too long (maximum 30 characters).';
    }
  }

  if (data.consentAccepted === false) {
    errors.consent = 'Please accept DhobiGo terms and privacy policy to continue.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate Sign-In fields
 */
export function validateSignIn(
  email: string,
  password: string
): { valid: boolean; errors: { email?: string; password?: string } } {
  const errors: { email?: string; password?: string } = {};

  if (!email || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate Reset Password fields
 */
export function validateResetPassword(data: ResetPasswordData): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (data.newPassword !== undefined) {
    if (!data.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (data.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters.';
    }

    if (data.newPassword !== data.confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
