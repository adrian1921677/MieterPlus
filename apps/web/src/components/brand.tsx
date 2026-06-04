import Image from 'next/image';

type BrandProps = {
  /** Logo-Größe in Pixel. Default 48. */
  size?: number;
  /** "horizontal" = Logo + Text nebeneinander | "stacked" = Logo oben, Text drunter. Default "stacked". */
  layout?: 'horizontal' | 'stacked';
  /** Textfarbe-Variante: "dark" auf hellem Hintergrund, "light" auf dunklem. Default "dark". */
  variant?: 'dark' | 'light';
  /** Zusätzliche Klassen für den Container. */
  className?: string;
};

/**
 * Einheitliches MieterPlus-Branding: ADB-Logo + "Mieter +" mit
 * farbig animiertem "+" (plus-pulse Animation aus globals.css).
 */
export function MieterPlusBrand({
  size = 48,
  layout = 'stacked',
  variant = 'dark',
  className = '',
}: BrandProps) {
  const isStacked = layout === 'stacked';
  const textColor = variant === 'dark' ? 'text-brand' : 'text-white';
  const subtitleColor = variant === 'dark' ? 'text-zinc-400' : 'text-white/50';

  return (
    <span
      className={`inline-flex ${
        isStacked ? 'flex-col items-center gap-1.5' : 'flex-row items-center gap-3'
      } ${className}`}
    >
      <Image
        src="/logo.jpg"
        alt="ADB Dienstleistungen Logo"
        width={size}
        height={size}
        className="rounded-full object-contain"
        priority
      />
      <span
        className={`leading-tight ${isStacked ? 'text-center' : ''}`}
      >
        <span
          className={`block text-[13px] font-black uppercase tracking-[0.18em] ${textColor}`}
        >
          Mieter <span aria-hidden className="plus-pulse">+</span>
          <span className="sr-only">Plus</span>
        </span>
        {layout === 'stacked' && (
          <span
            className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.2em] ${subtitleColor}`}
          >
            Eine App von ADB
          </span>
        )}
      </span>
    </span>
  );
}
