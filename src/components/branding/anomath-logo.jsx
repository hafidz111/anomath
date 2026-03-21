import { ANOMATH_LOGO_SRC, ANOMATH_NAME } from '@/lib/branding';
import { cn } from '@/lib/utils';

const MARK_SIZES = {
  xs: 'h-7 w-7 rounded-lg',
  sm: 'h-8 w-8 rounded-xl',
  /** Nav / top bar (match ikon lama 36px) */
  bar: 'h-9 w-9 rounded-xl',
  md: 'h-10 w-10 rounded-2xl',
  lg: 'h-16 w-16 rounded-3xl',
  xl: 'h-16 w-16 rounded-2xl shadow-md',
};

const WORDMARK_SIZES = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

const WORDMARK_VARIANT = {
  gradient:
    'font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
  /** Landing / marketing (lebih terang) */
  gradientSoft:
    'font-bold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent',
  solid: 'font-bold text-gray-900',
  brand: 'font-bold text-purple-600',
  muted: 'font-semibold text-gray-700',
};

/**
 * Hanya marka gambar (logo file).
 * @param {'xs'|'sm'|'bar'|'md'|'lg'|'xl'} size
 * @param {boolean} [decorative=true] — `false` jika tidak ada teks "Anomath" di samping (untuk alt).
 */
export function AnomathLogoMark({ size = 'md', className, imgClassName, decorative = true }) {
  return (
    <img
      src={ANOMATH_LOGO_SRC}
      alt={decorative ? '' : ANOMATH_NAME}
      decoding='async'
      className={cn(
        'shrink-0 border border-purple-100 object-cover shadow-sm',
        MARK_SIZES[size] ?? MARK_SIZES.md,
        imgClassName,
        className,
      )}
    />
  );
}

/**
 * Hanya teks "Anomath".
 */
export function AnomathWordmark({
  size = 'md',
  variant = 'gradient',
  className,
  as: Comp = 'span',
}) {
  return (
    <Comp
      className={cn(
        WORDMARK_SIZES[size] ?? WORDMARK_SIZES.md,
        WORDMARK_VARIANT[variant] ?? WORDMARK_VARIANT.gradient,
        className,
      )}
    >
      {ANOMATH_NAME}
    </Comp>
  );
}

/**
 * Mark + wordmark opsional + tagline opsional.
 * @param {string} [tagline] — default pakai ANOMATH_TAGLINE jika `true` dianggap tidak dipakai; gunakan prop eksplisit.
 */
export function AnomathLogo({
  size = 'md',
  showWordmark = true,
  wordmarkVariant = 'gradient',
  tagline,
  className,
  imgClassName,
  wordmarkClassName,
}) {
  const gap = size === 'lg' ? 'gap-3' : 'gap-2';
  const taglineClass =
    size === 'lg' ? 'mt-0.5 text-sm text-gray-600' : 'mt-0.5 text-xs text-gray-600';

  return (
    <div className={cn('flex min-w-0 items-center', gap, className)}>
      <AnomathLogoMark size={size} imgClassName={imgClassName} decorative={Boolean(showWordmark)} />
      {showWordmark ? (
        <div className='min-w-0'>
          <AnomathWordmark size={size} variant={wordmarkVariant} className={wordmarkClassName} />
          {typeof tagline === 'string' && tagline.trim() !== '' ? (
            <p className={taglineClass}>{tagline}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
