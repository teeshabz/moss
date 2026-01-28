/**
 * Media type icons - solid, angular, geometric style
 * All icons use fill="currentColor" for easy color control
 * Default size: 32px
 */

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

// Book Icon - solid angular book with horizontal lines
export function BookIcon({ size = 32, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      {/* Book cover */}
      <rect x="8" y="6" width="16" height="20" rx="1" fill="currentColor" />
      {/* Pages with horizontal lines */}
      <rect x="9" y="7" width="14" height="18" fill="currentColor" opacity="0.9" />
      <line x1="11" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="11" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="11" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

// Article Icon - solid angular newspaper with header and text lines
export function NewspaperIcon({ size = 32, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      {/* Newspaper base */}
      <rect x="6" y="6" width="20" height="20" rx="1" fill="currentColor" />
      {/* Header block */}
      <rect x="8" y="8" width="16" height="4" fill="currentColor" opacity="0.7" />
      {/* Column divider */}
      <line x1="16" y1="14" x2="16" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      {/* Text lines */}
      <line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="9" y1="16" x2="15" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="17" y1="15" x2="23" y2="15" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="17" y1="18" x2="23" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="9" y1="20" x2="15" y2="20" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="17" y1="21" x2="23" y2="21" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    </svg>
  )
}

// Movie Icon - solid angular film strip with sprocket holes
export function FilmIcon({ size = 32, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      {/* Film strip base */}
      <rect x="6" y="10" width="20" height="12" rx="1" fill="currentColor" />
      {/* Sprocket holes - left side */}
      <rect x="7" y="12" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
      <rect x="7" y="16" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
      <rect x="7" y="20" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
      {/* Sprocket holes - right side */}
      <rect x="23" y="12" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
      <rect x="23" y="16" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
      <rect x="23" y="20" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
      {/* Center viewing area */}
      <rect x="11" y="13" width="10" height="6" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

// Song Icon - solid angular music note
export function MusicIcon({ size = 32, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      {/* Note head (rectangular) */}
      <rect x="12" y="18" width="8" height="6" rx="1" fill="currentColor" />
      {/* Stem (rectangular) */}
      <rect x="18" y="8" width="2.5" height="10" fill="currentColor" />
      {/* Flag (angular) */}
      <path
        d="M20.5 8 L20.5 12 L26 10 L26 8 Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Album Icon - solid vinyl disc/record with center hole
export function DiscIcon({ size = 32, className, style }: IconProps) {
  const maskId = `disc-mask-${Math.random().toString(36).substr(2, 9)}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      <defs>
        <mask id={maskId}>
          <rect width="32" height="32" fill="white" />
          <circle cx="16" cy="16" r="3" fill="black" />
        </mask>
      </defs>
      {/* Outer disc */}
      <circle cx="16" cy="16" r="14" fill="currentColor" mask={`url(#${maskId})`} />
      {/* Inner ring (grooves) */}
      <circle cx="16" cy="16" r="10" fill="currentColor" opacity="0.7" mask={`url(#${maskId})`} />
    </svg>
  )
}

// Podcast Icon - solid vertical rectangle
export function PodcastIcon({ size = 32, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
    >
      {/* Vertical rectangle */}
      <rect x="12" y="6" width="8" height="20" rx="1" fill="currentColor" />
    </svg>
  )
}
