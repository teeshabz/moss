/**
 * Clerk appearance theme for Moss: dark background, green primary accent.
 * Use with ClerkProvider or pass to SignIn/SignUp appearance prop.
 * Elements use minimal overrides so Clerk's form stays visible (card has visible bg).
 */
export const mossClerkAppearance = {
  variables: {
    colorPrimary: '#2d5016',
    colorBackground: '#000000',
    colorInputBackground: '#171717',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#9ca3af', // gray-400
    colorDanger: '#f87171', // red-400
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center items-start',
    cardBox: 'bg-stone-900 flex justify-center shadow-none',
    card: 'text-center w-full max-w-[360px]',
    headerTitle: { className: '!hidden', style: { display: 'none' } },
    headerSubtitle: 'hidden',
    // Hide the header container (Clerk may wrap title in a header element)
    header: { className: '!hidden', style: { display: 'none' } },
    // Google button: flat, one color, no 3D (no shadow/gradient)
    socialButtonsBlockButton:
      'border-2 border-solid border-stone-400 bg-transparent shadow-none rounded-none lowercase transition-colors hover:border-stone-300 hover:text-stone-200',
    socialButtonsBlockButtonText: 'lowercase',
    // Divider "or" line
    dividerLine: 'bg-stone-600',
    dividerText: 'text-white text-center',
    // Label: stone-500 text, uppercase, small, centered
    formFieldLabel: 'text-stone-500 uppercase text-xs tracking-wide text-center',
    // Email input: thin border, centered text
    formFieldInput:
      'border border-solid border-stone-400 bg-stone-900/30 text-stone-200 rounded-none placeholder:text-stone-500 text-center',
    // Continue: flat green button (match .continue-button)
    formButtonPrimary:
      'w-full py-3 bg-[#2d5016] text-white text-sm font-bold lowercase border-0 rounded-none transition-colors duration-150 cursor-pointer hover:bg-[#3d6a1e] focus:outline-none focus:ring-0',
    footerAction: 'text-center justify-center',
    footerActionText: 'text-stone-400 text-sm lowercase text-center',
    footerActionLink: 'text-sm font-bold text-[#2d5016] hover:text-[#3a6b1e] lowercase text-center',
    identityPreviewEditButton: 'text-[#2d5016] hover:text-[#3a6b1e]',
  },
}

/** SignUp: same as base but show header in lowercase (login keeps header hidden). */
export const mossClerkAppearanceSignUp = {
  ...mossClerkAppearance,
  elements: {
    ...mossClerkAppearance.elements,
    headerTitle: 'text-center lowercase',
    header: '',
  },
}
