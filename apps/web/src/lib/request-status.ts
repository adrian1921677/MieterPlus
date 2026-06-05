/**
 * Einheitliches Farb- und Icon-System für Mängel-Status.
 * Wird überall in der App verwendet — Listen, Detail-Views, Stats-Karten.
 *
 * Farb-Logik:
 * - open      → AMBER  (Aufmerksamkeit, noch unbearbeitet)
 * - in_progress → BLUE  (in Arbeit, akzent-blau wie Logo)
 * - resolved  → INDIGO/PURPLE  (vorgemerkt, wartet auf Bestätigung)
 * - closed    → GRÜN   (erfolgreich abgeschlossen)
 * - rejected  → ZINC   (geschlossen ohne Erfolg, neutral grau)
 */

import type { RequestStatus } from '@mieterplus/shared';
import { REQUEST_STATUS_LABELS_DE } from '@mieterplus/shared';

export type StatusStyle = {
  label: string;
  /** Variant für <Badge> Komponente */
  badge: 'success' | 'warning' | 'info' | 'secondary' | 'destructive' | 'outline';
  /** Tailwind-Klassen für farbige Akzent-Borders + Hintergründe */
  ring: string;
  /** Tailwind-Klasse für Punkt-Indikator (für Filter-Tabs oder Stats) */
  dot: string;
  /** Beschreibender Text für Tooltips/Cards */
  description: string;
};

const STYLES: Record<RequestStatus, StatusStyle> = {
  open: {
    label: REQUEST_STATUS_LABELS_DE.open,
    badge: 'warning',
    ring: 'border-amber-300 bg-amber-50',
    dot: 'bg-amber-400',
    description: 'Noch nicht in Bearbeitung.',
  },
  in_progress: {
    label: REQUEST_STATUS_LABELS_DE.in_progress,
    badge: 'info',
    ring: 'border-[#2563a8]/40 bg-[#eff6ff]',
    dot: 'bg-[#2563a8]',
    description: 'Wird gerade bearbeitet.',
  },
  resolved: {
    label: REQUEST_STATUS_LABELS_DE.resolved,
    badge: 'secondary',
    ring: 'border-indigo-300 bg-indigo-50',
    dot: 'bg-indigo-500',
    description: 'Vermieter sagt: behoben. Wartet auf Mieter-Bestätigung.',
  },
  closed: {
    label: REQUEST_STATUS_LABELS_DE.closed,
    badge: 'success',
    ring: 'border-emerald-300 bg-emerald-50',
    dot: 'bg-emerald-500',
    description: 'Geschlossen und archiviert.',
  },
  rejected: {
    label: REQUEST_STATUS_LABELS_DE.rejected,
    badge: 'destructive',
    ring: 'border-zinc-300 bg-zinc-50',
    dot: 'bg-zinc-500',
    description: 'Abgelehnt.',
  },
};

export function getStatusStyle(status: string | RequestStatus): StatusStyle {
  return STYLES[status as RequestStatus] ?? STYLES.open;
}

/** Status, die als "offen / aktiv" gelten (für Stat-Filterungen). */
export const ACTIVE_STATUSES: RequestStatus[] = ['open', 'in_progress'];

/** Status, die als "abgeschlossen" gelten. */
export const FINAL_STATUSES: RequestStatus[] = ['closed', 'rejected'];

export function isActive(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as RequestStatus);
}
