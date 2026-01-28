/**
 * Pixelated Moss logo icon
 * 16x16 grid with organic moss-like pattern
 * Each rect represents a 2x2 pixel block
 */
export function MossIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ color, imageRendering: 'pixelated' }}
      className="moss-icon"
    >
      {/* Row 1 (y=2): top center block */}
      <rect x="6" y="2" width="4" height="2" fill="currentColor" />
      
      {/* Row 2 (y=4): left, center, right */}
      <rect x="4" y="4" width="2" height="2" fill="currentColor" />
      <rect x="6" y="4" width="4" height="2" fill="currentColor" />
      <rect x="10" y="4" width="2" height="2" fill="currentColor" />
      
      {/* Row 3 (y=6): far left, far right */}
      <rect x="2" y="6" width="4" height="2" fill="currentColor" />
      <rect x="10" y="6" width="4" height="2" fill="currentColor" />
      
      {/* Row 4 (y=8): left, right */}
      <rect x="4" y="8" width="2" height="2" fill="currentColor" />
      <rect x="10" y="8" width="2" height="2" fill="currentColor" />
      
      {/* Row 5 (y=10): center */}
      <rect x="6" y="10" width="4" height="2" fill="currentColor" />
      
      {/* Row 6 (y=12): left, right */}
      <rect x="4" y="12" width="2" height="2" fill="currentColor" />
      <rect x="10" y="12" width="2" height="2" fill="currentColor" />
      
      {/* Row 7 (y=14): bottom center block */}
      <rect x="6" y="14" width="4" height="2" fill="currentColor" />
    </svg>
  )
}
