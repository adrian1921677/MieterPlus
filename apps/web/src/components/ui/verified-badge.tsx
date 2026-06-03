import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Instagram-Style Verified-Badge: blauer Haken im Stern.
 * Zeigt an, dass eine Immobilie verifiziertes Eigentum ist.
 */
export function VerifiedBadge({
  size = 18,
  className,
  label = 'Eigentum verifiziert',
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center', className)}
      title={label}
      aria-label={label}
    >
      <BadgeCheck
        size={size}
        className="fill-blue-500 text-white"
        strokeWidth={2.5}
      />
    </span>
  );
}
