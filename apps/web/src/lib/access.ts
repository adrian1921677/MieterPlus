import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ManagerPermission, ManagerPermissions } from '@mieterplus/shared';

export type PropertyAccess = {
  /** Alle Property-IDs, die der User sehen darf (eigene + verwaltete). */
  allIds: string[];
  /** Property-IDs, die dem User selbst gehören. */
  ownedIds: string[];
  /** Map: property_id → erteilte Verwalter-Berechtigungen (nur bei verwalteten). */
  managedPerms: Record<string, ManagerPermissions>;
};

/**
 * Ermittelt, auf welche Immobilien ein User Zugriff hat:
 * - eigene (owner_id = userId)
 * - als aktive Hausverwaltung zugewiesene (property_managers.status='active')
 *
 * Benötigt den Service-Client (umgeht RLS, da wir über mehrere Tabellen joinen).
 */
export async function getPropertyAccess(
  service: SupabaseClient,
  userId: string,
): Promise<PropertyAccess> {
  const [{ data: owned }, { data: assignments }] = await Promise.all([
    service.from('properties').select('id').eq('owner_id', userId),
    service
      .from('property_managers')
      .select('id, permissions, property_manager_properties(property_id)')
      .eq('manager_id', userId)
      .eq('status', 'active'),
  ]);

  const ownedIds = (owned ?? []).map((p) => p.id as string);
  const managedPerms: Record<string, ManagerPermissions> = {};

  for (const a of assignments ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aa: any = a;
    const perms = (aa.permissions ?? {}) as ManagerPermissions;
    for (const link of aa.property_manager_properties ?? []) {
      const pid = link.property_id as string;
      // Falls mehrere Zuweisungen: Rechte vereinen (OR)
      const existing = managedPerms[pid] ?? {};
      managedPerms[pid] = {
        requests: existing.requests || perms.requests,
        vault: existing.vault || perms.vault,
        appointments: existing.appointments || perms.appointments,
        properties: existing.properties || perms.properties,
      };
    }
  }

  const allIds = Array.from(new Set([...ownedIds, ...Object.keys(managedPerms)]));
  return { allIds, ownedIds, managedPerms };
}

/** Property-IDs, auf die der User eine bestimmte Berechtigung hat (eigene zählen immer). */
export function propertyIdsWithPermission(
  access: PropertyAccess,
  permission: ManagerPermission,
): string[] {
  const fromManaged = Object.entries(access.managedPerms)
    .filter(([, perms]) => perms[permission])
    .map(([pid]) => pid);
  return Array.from(new Set([...access.ownedIds, ...fromManaged]));
}

/** Hat der User für diese Property die Berechtigung (als Eigentümer oder Verwalter)? */
export function hasPropertyPermission(
  access: PropertyAccess,
  propertyId: string,
  permission: ManagerPermission,
): boolean {
  if (access.ownedIds.includes(propertyId)) return true;
  return Boolean(access.managedPerms[propertyId]?.[permission]);
}

/** Ist der User irgendwo aktive Hausverwaltung mit der gegebenen Berechtigung? */
export async function userHasManagerPermission(
  service: SupabaseClient,
  userId: string,
  permission: ManagerPermission,
): Promise<boolean> {
  const { data } = await service
    .from('property_managers')
    .select('permissions')
    .eq('manager_id', userId)
    .eq('status', 'active');
  return (data ?? []).some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.permissions?.[permission] === true,
  );
}
