'use client'

import {
  BookIcon,
  NewspaperIcon,
  FilmIcon,
  MusicIcon,
  DiscIcon,
  PodcastIcon,
  LiveIcon,
} from '@/lib/components/SharePageMediaIcons'

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

export function getMediaTypeLabel(mediaType: string): string {
  return mediaType.toLowerCase()
}

export function MediaTypeFilledIcon({
  mediaType,
  size = 14,
  className,
  color,
}: {
  mediaType: string
  size?: number
  className?: string
  color?: string
}) {
  const style = { color: color ?? 'currentColor' }
  switch (mediaType.toUpperCase()) {
    case 'BOOK':
      return <BookIcon size={size} className={className} style={style} />
    case 'ARTICLE':
      return <NewspaperIcon size={size} className={className} style={style} />
    case 'MOVIE':
      return <FilmIcon size={size} className={className} style={style} />
    case 'SONG':
      return <MusicIcon size={size} className={className} style={style} />
    case 'ALBUM':
      return <DiscIcon size={size} className={className} style={style} />
    case 'PODCAST':
      return <PodcastIcon size={size} className={className} style={style} />
    case 'LIVE':
      return <LiveIcon size={size} className={className} style={style} />
    default:
      return <MusicIcon size={size} className={className} style={style} />
  }
}

/** 12-pointed circular star icon */
export function StarIcon({ color, size = 16 }: { color: string; size?: number }) {
  const points: string[] = []
  const centerX = 12
  const centerY = 12
  const outerRadius = 10
  const innerRadius = 6

  for (let i = 0; i < 12; i++) {
    const outerAngle = (i * 2 * Math.PI) / 12 - Math.PI / 2
    const outerX = centerX + outerRadius * Math.cos(outerAngle)
    const outerY = centerY + outerRadius * Math.sin(outerAngle)
    points.push(`${outerX},${outerY}`)

    const innerAngle = ((i + 0.5) * 2 * Math.PI) / 12 - Math.PI / 2
    const innerX = centerX + innerRadius * Math.cos(innerAngle)
    const innerY = centerY + innerRadius * Math.sin(innerAngle)
    points.push(`${innerX},${innerY}`)
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color }}>
      <polygon points={points.join(' ')} fill="currentColor" />
    </svg>
  )
}

export function PlusIcon({
  saved,
  size = 14,
  className,
}: {
  saved: boolean
  size?: number
  className?: string
}) {
  const strokeWidth = saved ? 4 : 3
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
