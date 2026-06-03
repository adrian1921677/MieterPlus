export const APP_NAME = 'MieterPlus';
export const APP_PUBLISHER = 'ADB';

export const ROLES = ['tenant', 'landlord', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const REQUEST_CATEGORIES = [
  'heating',
  'plumbing',
  'electrical',
  'structural',
  'appliance',
  'pest',
  'other',
] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export const REQUEST_CATEGORY_LABELS_DE: Record<RequestCategory, string> = {
  heating: 'Heizung',
  plumbing: 'Sanitär / Wasser',
  electrical: 'Elektrik',
  structural: 'Bauschäden',
  appliance: 'Haushaltsgeräte',
  pest: 'Schädlinge',
  other: 'Sonstiges',
};

export const REQUEST_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const REQUEST_PRIORITY_LABELS_DE: Record<RequestPriority, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
  urgent: 'Dringend',
};

export const REQUEST_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS_DE: Record<RequestStatus, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  resolved: 'Behoben',
  closed: 'Geschlossen',
  rejected: 'Abgelehnt',
};

export const PROPERTY_OWNERSHIP_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type PropertyOwnershipStatus = (typeof PROPERTY_OWNERSHIP_STATUSES)[number];

export const OWNERSHIP_DOCUMENT_TYPES = [
  'land_register',
  'notary_deed',
  'purchase_contract',
  'other',
] as const;
export type OwnershipDocumentType = (typeof OWNERSHIP_DOCUMENT_TYPES)[number];

export const TENANT_INVITATION_CODE_LENGTH = 12;
export const TENANT_INVITATION_EXPIRES_DAYS = 30;
export const TENANT_INVITATION_MAX_VERIFY_ATTEMPTS = 5;

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_REQUEST = 8;
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
] as const;

export const STORAGE_BUCKETS = {
  ownershipDocuments: 'ownership-documents',
  requestAttachments: 'request-attachments',
} as const;
