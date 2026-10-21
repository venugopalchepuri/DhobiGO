export type LaundryStatus = 'pending' | 'partially_returned' | 'collected';

export interface LaundryItem {
  id: string;
  category: string;
  quantityGiven: number;
  quantityReturned: number;
}

export interface LaundryRecord {
  id: string; // Internal unique ID e.g. "DT-0001"
  userId: string; // Strictly required owner user account ID
  slipNumber?: string; // Optional handwritten chit slip number
  dateGiven: string; // ISO format "YYYY-MM-DD"
  dhobiName?: string; // Optional dhobi or laundry shop name
  totalItems: number; // Derived from confirmed quantities
  amount?: number; // Optional price or total charges in rupees
  expectedReturnDate?: string; // Optional expected date
  notes?: string;
  status: LaundryStatus;
  chitImageData?: string; // Data URL or base64 blob string stored durably
  hasChitImage?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ClothingCategory {
  id: string;
  name: string;
  isDefault: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface AppSettings {
  defaultDhobiName: string;
  currencySymbol: string;
  autoOcrEnabled: boolean;
  themeMode: 'system' | 'light' | 'dark';
}

export interface ExtractedOCRItem {
  category: string;
  quantity: number;
  confidence: number;
  rawText?: string;
}

export interface OCRResult {
  rawText: string;
  slipNumber?: string;
  date?: string;
  totalItemsDetected?: number;
  detectedItems: ExtractedOCRItem[];
  confidence: number;
  notes?: string;
}

export type IDType =
  | 'College / Student ID'
  | 'Employee / Office ID'
  | 'Aadhaar Card'
  | 'Driving License'
  | 'Society / Flat Pass'
  | 'Voter ID'
  | 'Passport'
  | 'Other ID';

export interface IDProofCredential {
  idType: IDType;
  fullName: string;
  idNumber: string;
  phoneNumber?: string;
  roomOrFlatNo?: string;
  notes?: string;
  frontPhotoData?: string; // Data URL of front of ID card
  backPhotoData?: string; // Data URL of back of ID card (optional)
  updatedAt: number;
}

export interface UserProfile {
  userId: string; // e.g. "USR-1001"
  fullName: string;
  email: string; // Normalized lowercase email
  phoneNumber?: string; // Optional contact phone
  passwordHash?: string; // Secure PBKDF2 hash
  passwordSalt?: string; // Per-user random salt
  resetToken?: string; // Password reset token
  resetExpiresAt?: number;
  enrollmentNumber?: string;
  university?: string;
  course?: string;
  yearOfStudy?: string;
  batchYear?: string;
  profilePhoto?: string; // Data URL
  roomOrFlatNo?: string;
  isStudent: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface RegistrationFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  countryCode?: string;
  isStudent?: boolean;
  enrollmentNumber?: string;
  university?: string;
  course?: string;
  yearOfStudy?: string;
  batchYear?: string;
  roomOrFlatNo?: string;
  profilePhoto?: string;
  consentAccepted?: boolean;
}

export interface ResetPasswordData {
  email: string;
  token?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}


