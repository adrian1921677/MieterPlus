'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ICONS, isNavItemActive, type DashboardNavLink } from '@/lib/dashboard-nav';

type Props = {
  items: DashboardNavLink[];
  role: string;
  isPremium: boolean;
};

export function DashboardSidebarNav({ items, role, isPremium }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.iconName as keyof typeof NAV_ICONS] ?? NAV_ICONS.Home;
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            data-tour={item.href}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-accent-adb text-white shadow-sm'
                : 'text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-foreground'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                active ? '' : 'group-hover:scale-110'
              }`}
            />
            <span className="flex-1">{item.label}</span>
            {item.premium && !isPremium && role !== 'admin' && (
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  active ? 'bg-white/20 text-white' : 'bg-accent-adb/10 text-accent-adb'
                }`}
              >
                Pro
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
