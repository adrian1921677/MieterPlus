export const APP_NAME = 'MieterPlus';
export const APP_PUBLISHER = 'ADB';

export const ROLES = ['tenant', 'landlord', 'admin'] as const;
export type Role = (typeof ROLES)[number];

// =============================================================================
// Abo-Modell (Premium für Vermieter)
// =============================================================================
export const SUBSCRIPTION_PLANS = ['basic', 'premium'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_PLAN_LABELS_DE: Record<SubscriptionPlan, string> = {
  basic: 'Basic',
  premium: 'Premium',
};

// Feature-Keys für Premium-Gating (zentral, damit Frontend + API gleich sprechen)
export const PREMIUM_FEATURES = ['handover', 'vault_extended', 'appointments'] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

// Dokumenten-Tresor Kontingent pro Plan
export const VAULT_QUOTA: Record<SubscriptionPlan, number> = {
  basic: 5,
  premium: 200,
};

export const VAULT_DOCUMENT_TYPES = [
  'lease',
  'utility_statement',
  'house_rules',
  'other',
] as const;
export type VaultDocumentType = (typeof VAULT_DOCUMENT_TYPES)[number];

export const VAULT_DOCUMENT_TYPE_LABELS_DE: Record<VaultDocumentType, string> = {
  lease: 'Mietvertrag',
  utility_statement: 'Nebenkostenabrechnung',
  house_rules: 'Hausordnung',
  other: 'Sonstiges',
};

export const VAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
] as const;
export const VAULT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// =============================================================================
// Terminplaner
// =============================================================================
export const APPOINTMENT_PURPOSES = ['maintenance', 'viewing', 'meeting', 'other'] as const;
export type AppointmentPurpose = (typeof APPOINTMENT_PURPOSES)[number];

export const APPOINTMENT_PURPOSE_LABELS_DE: Record<AppointmentPurpose, string> = {
  maintenance: 'Reparatur / Wartung',
  viewing: 'Besichtigung',
  meeting: 'Besprechung',
  other: 'Sonstiges',
};

// =============================================================================
// Hausverwaltung — Verwalter-Berechtigungen
// =============================================================================
export const MANAGER_PERMISSIONS = ['requests', 'vault', 'appointments', 'properties'] as const;
export type ManagerPermission = (typeof MANAGER_PERMISSIONS)[number];

export const MANAGER_PERMISSION_LABELS_DE: Record<ManagerPermission, string> = {
  requests: 'Mängel verwalten',
  vault: 'Dokumenten-Tresor',
  appointments: 'Termine verwalten',
  properties: 'Immobilien & Mieter',
};

export const MANAGER_PERMISSION_DESCRIPTIONS_DE: Record<ManagerPermission, string> = {
  requests: 'Mängelmeldungen sehen, bearbeiten und kommentieren.',
  vault: 'Dokumente sehen und hochladen.',
  appointments: 'Termin-Slots anlegen und Buchungen einsehen.',
  properties: 'Wohneinheiten, Mieter-Codes und Übergabeprotokolle verwalten.',
};

export type ManagerPermissions = Partial<Record<ManagerPermission, boolean>>;

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
