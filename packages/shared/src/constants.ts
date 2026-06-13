export const APP_NAME = 'MieterPlus';
export const APP_PUBLISHER = 'ADB';

export const ROLES = ['tenant', 'landlord', 'admin'] as const;
export type Role = (typeof ROLES)[number];

// =============================================================================
// Abo-Modell — Trial (14 Tage) / Plus / Pro / Pay-as-you-go
// Free wurde abgeschafft; jeder neue Vermieter bekommt automatisch 14d Trial.
// =============================================================================
export const SUBSCRIPTION_PLANS = ['trial', 'plus', 'pro', 'payg'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_PLAN_LABELS_DE: Record<SubscriptionPlan, string> = {
  trial: 'Testversion',
  plus: 'Plus',
  pro: 'Pro',
  payg: 'Pay-as-you-go',
};

/** Bezahlte Pläne (= "Premium"-Zugang). Trial gilt auch als premium. */
export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan === 'plus' || plan === 'pro' || plan === 'payg';
}

/** Plan zählt als aktiver Premium-Zugang (Trial inklusive). */
export function isActiveAccessPlan(plan: SubscriptionPlan): boolean {
  return plan === 'trial' || isPaidPlan(plan);
}

export const TRIAL_DURATION_DAYS = 14;

// Preise (Brutto inkl. MwSt), Stripe rechnet ab. Nur Monatspreise — kein Jahresrabatt mehr.
export const PLAN_PRICES: Record<'plus' | 'pro', { monthly: number }> = {
  plus: { monthly: 29.99 },
  pro: { monthly: 49.99 },
};

// Limits & Feature-Zugang pro Stufe. null = unbegrenzt.
export type PlanLimits = {
  properties: number | null;
  units: number | null;
  vaultDocs: number;
  managers: number | null;
  handover: boolean;
  appointments: boolean;
  statistics: boolean;
};

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  // Trial = vollwertiger Plus-Zugang
  trial: { properties: 3, units: 30, vaultDocs: 25, managers: 0, handover: false, appointments: true, statistics: true },
  plus:  { properties: 3, units: 30, vaultDocs: 25, managers: 0, handover: false, appointments: true, statistics: true },
  pro:   { properties: 10, units: 100, vaultDocs: 100, managers: 1, handover: true, appointments: true, statistics: true },
  // PayG: Limits werden zur Laufzeit aus payg_modules berechnet — hier nur Defaults.
  payg:  { properties: 1, units: 10, vaultDocs: 0, managers: 0, handover: false, appointments: false, statistics: false },
};

// Feature-Keys für Gating (zentral)
export const PREMIUM_FEATURES = ['handover', 'appointments', 'statistics'] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

// Dokumenten-Tresor Kontingent pro Plan (Convenience aus PLAN_LIMITS)
export const VAULT_QUOTA: Record<SubscriptionPlan, number> = {
  trial: PLAN_LIMITS.trial.vaultDocs,
  plus: PLAN_LIMITS.plus.vaultDocs,
  pro: PLAN_LIMITS.pro.vaultDocs,
  payg: PLAN_LIMITS.payg.vaultDocs,
};

// =============================================================================
// Pay-as-you-go: Bausteine (Preise in Cents, monatlich)
// =============================================================================
export type PaygModules = {
  /** Anzahl zusätzlicher Immobilien (über die enthaltene 1 hinaus). */
  extraProperties: number;
  /** Anzahl 10er-Pakete Einheiten (über die enthaltenen 10 hinaus). */
  unitsBundles: number;
  /** Anzahl 25er-Pakete Vault-Dokumente. */
  vaultBundles: number;
  /** Übergabeprotokoll-Modul gebucht? */
  handover: boolean;
  /** Terminplaner mit Push-Benachrichtigung gebucht? */
  appointmentsPremium: boolean;
  /** Anzahl eingeladener Hausverwalter. */
  managers: number;
};

export const PAYG_BASE_PRICE_CENTS = 999; // Grund-Abo (1 Immobilie, 10 Einheiten)
export const PAYG_PRICES_CENTS = {
  extraProperty: 400, // pro zusätzliche Immobilie
  unitsBundle: 300, // pro 10er-Paket Einheiten
  vaultBundle: 300, // pro 25er-Paket Vault-Dokumente
  handover: 700, // Übergabeprotokoll-Modul
  appointmentsPremium: 500, // Terminplaner mit Push
  manager: 500, // pro Hausverwalter
} as const;

/** Berechnet den monatlichen Pay-as-you-go-Preis in Cents. */
export function calcPaygPriceCents(m: PaygModules): number {
  return (
    PAYG_BASE_PRICE_CENTS +
    Math.max(0, m.extraProperties) * PAYG_PRICES_CENTS.extraProperty +
    Math.max(0, m.unitsBundles) * PAYG_PRICES_CENTS.unitsBundle +
    Math.max(0, m.vaultBundles) * PAYG_PRICES_CENTS.vaultBundle +
    (m.handover ? PAYG_PRICES_CENTS.handover : 0) +
    (m.appointmentsPremium ? PAYG_PRICES_CENTS.appointmentsPremium : 0) +
    Math.max(0, m.managers) * PAYG_PRICES_CENTS.manager
  );
}

/** Ermittelt die effektiven Limits für einen PayG-Account. */
export function paygLimits(m: PaygModules): PlanLimits {
  return {
    properties: 1 + Math.max(0, m.extraProperties),
    units: 10 + Math.max(0, m.unitsBundles) * 10,
    vaultDocs: Math.max(0, m.vaultBundles) * 25,
    managers: Math.max(0, m.managers),
    handover: m.handover,
    appointments: m.appointmentsPremium,
    statistics: true,
  };
}

export const PAYG_DEFAULT_MODULES: PaygModules = {
  extraProperties: 0,
  unitsBundles: 0,
  vaultBundles: 1,
  handover: false,
  appointmentsPremium: false,
  managers: 0,
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

// Schnellauswahl-Vorlagen beim Mangel melden
export const REQUEST_TEMPLATES: { title: string; category: RequestCategory }[] = [
  { title: 'Heizung wird nicht warm', category: 'heating' },
  { title: 'Wasserhahn tropft', category: 'plumbing' },
  { title: 'Verstopfter Abfluss', category: 'plumbing' },
  { title: 'Steckdose ohne Strom', category: 'electrical' },
  { title: 'Licht / Lampe defekt', category: 'electrical' },
  { title: 'Schimmel an der Wand', category: 'structural' },
  { title: 'Fenster undicht / klemmt', category: 'structural' },
  { title: 'Gerät defekt (Herd/Kühlschrank)', category: 'appliance' },
  { title: 'Schädlinge / Ungeziefer', category: 'pest' },
];

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
