import {
  Home,
  Building2,
  Wrench,
  ShieldCheck,
  Users,
  Users2,
  UserCheck,
  BadgeCheck,
  PlusCircle,
  UserCircle,
  FileSignature,
  FolderLock,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react';

/**
 * Gemeinsame Navigations-Definition für Desktop-Sidebar und Mobile-Drawer.
 * Icons werden als String referenziert, damit die Liste auch serialisierbar
 * an Client-Komponenten übergeben werden kann (Server → Client).
 */
export type DashboardNavItem = {
  href: string;
  label: string;
  iconName: keyof typeof NAV_ICONS;
  roles: string[];
  premium?: boolean;
  managerVisible?: boolean;
};

/** Serialisierbare Variante (ohne roles/managerVisible) für Client-Komponenten. */
export type DashboardNavLink = {
  href: string;
  label: string;
  iconName: string;
  premium?: boolean;
};

export const NAV_ICONS = {
  Home,
  Building2,
  Wrench,
  ShieldCheck,
  Users,
  Users2,
  UserCheck,
  BadgeCheck,
  PlusCircle,
  UserCircle,
  FileSignature,
  FolderLock,
  CalendarClock,
} satisfies Record<string, LucideIcon>;

/** Aktiv-Erkennung: exakte Übersicht oder Unterpfad des Eintrags. */
export function isNavItemActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  // ── Mieter ──────────────────────────────────────────────
  { href: '/dashboard', label: 'Übersicht', iconName: 'Home', roles: ['tenant', 'landlord', 'admin'] },
  { href: '/dashboard/my-requests', label: 'Meine Mängel', iconName: 'Wrench', roles: ['tenant'] },
  { href: '/dashboard/my-requests/new', label: 'Mangel melden', iconName: 'PlusCircle', roles: ['tenant'] },
  { href: '/dashboard/my-documents', label: 'Meine Dokumente', iconName: 'FolderLock', roles: ['tenant'] },
  { href: '/dashboard/my-appointments', label: 'Termine', iconName: 'CalendarClock', roles: ['tenant'] },
  { href: '/dashboard/profile', label: 'Mein Profil', iconName: 'UserCircle', roles: ['tenant'] },
  // ── Vermieter ───────────────────────────────────────────
  { href: '/dashboard/verify-identity', label: 'Identität verifizieren', iconName: 'BadgeCheck', roles: ['landlord'] },
  { href: '/dashboard/properties', label: 'Immobilien', iconName: 'Building2', roles: ['landlord', 'admin'], managerVisible: true },
  { href: '/dashboard/requests', label: 'Mängel', iconName: 'Wrench', roles: ['landlord', 'admin'], managerVisible: true },
  { href: '/dashboard/managers', label: 'Hausverwaltung', iconName: 'Users2', roles: ['landlord'] },
  // ── Vermieter — Premium ─────────────────────────────────
  { href: '/dashboard/handover', label: 'Übergabeprotokoll', iconName: 'FileSignature', roles: ['landlord', 'admin'], premium: true },
  { href: '/dashboard/vault', label: 'Dokumenten-Tresor', iconName: 'FolderLock', roles: ['landlord', 'admin'], managerVisible: true },
  { href: '/dashboard/appointments', label: 'Terminplaner', iconName: 'CalendarClock', roles: ['landlord', 'admin'], premium: true, managerVisible: true },
  // ── Vermieter — Profil ──────────────────────────────────
  { href: '/dashboard/profile', label: 'Mein Profil', iconName: 'UserCircle', roles: ['landlord'] },
  // ── Admin ───────────────────────────────────────────────
  { href: '/dashboard/admin/users', label: 'Alle User', iconName: 'Users', roles: ['admin'] },
  { href: '/dashboard/admin/verifications', label: 'Immobilien-Prüfung', iconName: 'ShieldCheck', roles: ['admin'] },
  { href: '/dashboard/admin/identity-verifications', label: 'Identitäts-Prüfung', iconName: 'UserCheck', roles: ['admin'] },
];
