/**
 * Generate a random hex color for user avatars from a 100-color palette.
 * Used for random assignment when creating new profiles.
 */
export function generateAvatarColor(): string {
  const profileColors = [
    // Existing colors
    '#c17a6f', // terracotta rose
    '#6b8caf', // dusty blue
    '#9d8fb5', // muted lavender
    '#c9a5b8', // dusty pink
    '#8fa888', // sage green
    '#b88b9d', // mauve
    '#7d5a8f', // muted purple

    // Warm earth tones (reds, oranges, browns)
    '#a86858', // burnt sienna
    '#c4917a', // peach terracotta
    '#b5735e', // rust
    '#d4a088', // apricot
    '#8b5e4d', // cocoa
    '#a67c52', // caramel
    '#c9956c', // amber sand
    '#9e6b55', // clay
    '#b88a6f', // tan rose
    '#a07560', // dusty coral
    '#c78f7a', // salmon earth
    '#8f6a5a', // mocha
    '#b4846a', // sandstone
    '#a3725f', // copper dust
    '#c4a68a', // warm sand
    '#9b7a68', // taupe

    // Cool earth tones (blues, teals)
    '#5a7a8c', // slate blue
    '#7a9ba8', // dusty teal
    '#6889a0', // steel blue
    '#8aa4b5', // powder blue
    '#5d8a8f', // muted teal
    '#7b9ea3', // seafoam gray
    '#6a8b95', // ocean slate
    '#8fb0b8', // pale teal
    '#5c7d8a', // storm blue
    '#7a98a5', // fog blue
    '#6b9095', // sage teal
    '#8ca8af', // misty blue
    '#5f8085', // deep teal
    '#7da0a8', // soft cyan
    '#6a8890', // slate teal

    // Greens (sage, olive, moss)
    '#7a9b6f', // moss green
    '#8b9f7a', // sage
    '#6d8b65', // forest sage
    '#9aab8a', // pale olive
    '#7c9470', // fern
    '#8fa07a', // dusty green
    '#6b8568', // muted forest
    '#9db08f', // soft sage
    '#758f6a', // olive green
    '#8a9c7d', // lichen
    '#6f8a65', // moss
    '#98a888', // pale sage
    '#7d9573', // eucalyptus
    '#8b9f80', // seafoam green
    '#6a8560', // deep sage

    // Purples and mauves
    '#8b7a9f', // dusty violet
    '#a08fb0', // soft purple
    '#7a6b8f', // muted grape
    '#b5a5c0', // pale lavender
    '#8f7fa0', // twilight
    '#a595b5', // wisteria
    '#7d6d90', // plum dust
    '#b0a0ba', // soft mauve
    '#8a7a98', // dusty purple
    '#9f8faa', // lilac gray
    '#7f6f8a', // muted violet
    '#a898b0', // pale plum
    '#8878a0', // dusk purple
    '#9d8da8', // lavender gray

    // Pinks and roses
    '#b8909a', // dusty rose
    '#c9a0a8', // pale rose
    '#a88090', // mauve pink
    '#d0b0b8', // blush
    '#b08898', // antique rose
    '#c4a5ad', // soft pink
    '#a07888', // muted rose
    '#c8b0b5', // powder pink
    '#b59098', // dusty blush
    '#bf9da5', // rose taupe
    '#a58590', // mauve dust
    '#c5a8b0', // pale mauve
    '#b08a95', // vintage rose
    '#c0a0a8', // soft rose

    // Neutrals with color
    '#8a8580', // warm gray
    '#9f9590', // taupe gray
    '#858a85', // sage gray
    '#a09a95', // stone
    '#8b8a8f', // cool gray
    '#9a9590', // mushroom
    '#888580', // warm slate
    '#a5a098', // pale stone
    '#8f8a88', // greige
    '#9b9895', // pebble
    '#8a8888', // neutral gray
    '#a09d98', // driftwood
    '#8d8a85', // ash
    '#989590', // fog
    '#8b8985', // slate
  ]

  return profileColors[Math.floor(Math.random() * profileColors.length)]
}
