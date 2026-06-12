import Image from 'next/image';

type BrandProps = {
  /** Logo-Größe in Pixel. Default 72. */
  size?: number;
  /** "horizontal" = Logo + Text nebeneinander | "stacked" = Logo oben, Text drunter. Default "stacked". */
  layout?: 'horizontal' | 'stacked';
  /** Textfarbe-Variante: "dark" auf hellem Hintergrund, "light" auf dunklem. Default "dark". */
  variant?: 'dark' | 'light';
  /** Zusätzliche Klassen für den Container. */
  className?: string;
  /** Subtitle anzeigen? Default true bei stacked. */
  showSubtitle?: boolean;
};

/**
 * Einheitliches MieterPlus-Branding: ADB-Logo + "Mieter +" mit
 * farbig animiertem "+" (plus-pulse Animation aus globals.css).
 *
 * Logo wird in höherer Auflösung gerendert (×2 für Retina), Next/Image
 * skaliert dann sauber herunter — deutlich schärfer als JPG-default.
 */
export function MieterPlusBrand({
  size = 72,
  layout = 'stacked',
  variant = 'dark',
  className = '',
  showSubtitle,
}: BrandProps) {
  const isStacked = layout === 'stacked';
  const textColor = variant === 'dark' ? 'text-brand' : 'text-white';
  const subtitleColor = variant === 'dark' ? 'text-zinc-400' : 'text-white/50';
  const shouldShowSubtitle = showSubtitle ?? isStacked;

  // Textgröße responsive zur Logo-Größe
  const titleClass =
    size >= 96
      ? 'text-base font-black uppercase tracking-[0.18em]'
      : size >= 64
        ? 'text-sm font-black uppercase tracking-[0.18em]'
        : 'text-[13px] font-black uppercase tracking-[0.18em]';

  return (
    <span
      className={`inline-flex ${
        isStacked ? 'flex-col items-center gap-2' : 'flex-row items-center gap-3'
      } ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Mieter Plus Logo"
        width={size * 2}
        height={size * 2}
        sizes={`${size}px`}
        quality={95}
        priority
        style={{ width: size, height: size }}
        className="rounded-2xl object-contain"
      />
      <span className={`leading-tight ${isStacked ? 'text-center' : ''}`}>
        <span className={`block ${titleClass} ${textColor}`}>
          Mieter <span aria-hidden className="plus-pulse">+</span>
          <span className="sr-only">Plus</span>
        </span>
        {shouldShowSubtitle && (
          <span
            className={`mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] ${subtitleColor}`}
          >
            Eine App von ADB
          </span>
        )}
      </span>
    </span>
  );
}
