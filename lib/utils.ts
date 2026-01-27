/**
 * Generate a random warm-toned hex color for user avatars
 * Returns colors from a warm palette
 */
export function generateAvatarColor(): string {
  const warmColors = [
    '#E07C54', // Warm coral
    '#D4A574', // Warm beige
    '#C98B6A', // Warm tan
    '#E8A87C', // Warm peach
    '#D67B5F', // Warm terracotta
    '#C89B7B', // Warm sand
    '#E5B88A', // Warm honey
    '#D99B6C', // Warm amber
  ]

  // Pick a random color from the palette
  const randomIndex = Math.floor(Math.random() * warmColors.length)
  return warmColors[randomIndex]
}
