/**
 * Share-page-only media icons (new designs).
 * Used only on the share page; feed/profile use MediaIcons.
 */

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/** Book - vertical rectangle with spine on left */
export function BookIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <rect x="4" y="2" width="16" height="20" />
      <rect x="4" y="2" width="3" height="20" fill="black" fillOpacity={0.3} />
    </svg>
  )
}

/** Article - square with two horizontal lines (black for contrast) */
export function NewspaperIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <rect x="2" y="2" width="20" height="20" />
      <rect x="4" y="8" width="16" height="2" fill="black" />
      <rect x="4" y="14" width="16" height="2" fill="black" />
    </svg>
  )
}

/** Movie - film strip with sprocket holes and center screen */
export function FilmIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M2 3h20v18H2V3z M4 5v2h2V5H4z M4 9v2h2V9H4z M4 13v2h2v-2H4z M4 17v2h2v-2H4z M18 5v2h2V5h-2z M18 9v2h2V9h-2z M18 13v2h2v-2h-2z M18 17v2h2v-2h-2z M8 8h8v8H8V8z" />
    </svg>
  )
}

/** Song - filled play button triangle */
export function MusicIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M6 4L20 12L6 20V4Z" />
    </svg>
  )
}

/** Album - vinyl record with concentric circles; inner hole for contrast */
export function DiscIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      className={className}
      style={style}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  )
}

/** Podcast - top half of a circle (semi-circle) */
export function PodcastIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M4 12 A8 8 0 0 1 20 12 L12 12 Z" />
    </svg>
  )
}

/** Live - TV/monitor shape */
export function LiveIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M4 5 L4 9 A2.5 2.5 0 0 1 4 15 L4 19 L20 19 L20 15 A2.5 2.5 0 0 1 20 9 L20 5 Z" />
    </svg>
  )
}
