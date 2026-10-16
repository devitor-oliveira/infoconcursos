export const DS_PALETTE = {
  floralWhite: '#FFFCF2',
  pearlBeige: '#E5D5B3',
  carbonBlack: '#1B1A1B',
  deepTeal: '#607466',

  // Superfícies e Containers do Modelo Editorial
  background: '#121112',
  surface: '#1B1A1B',
  surfaceLowest: '#0F0E0F',
  surfaceLow: '#171617',
  surfaceContainer: '#1E1D1E',
  surfaceHigh: '#262527',
  surfaceHighest: '#313032',

  // Contornos e Acentos
  outline: '#748B7B',
  outlineVariant: '#373638',
  onSurface: '#FFFCF2',
  onSurfaceVariant: '#BDBAB5',
  tertiary: '#748B7B',
  tertiaryContainer: '#243028',
  secondaryContainer: '#262E29',

  semantic: {
    success: '#748B7B',
    warning: '#E5D5B3',
    danger: '#f87171',
    info: '#607466'
  }
} as const

export const DS_RULE_60_30_10 = {
  /** 60% Dominante: Canvas & Base Estrutural (Carbon Black / Background) */
  dominant60: {
    canvas: 'bg-[#121112]',
    surface: 'bg-[#1B1A1B]',
    recessed: 'bg-[#171617]'
  },
  /** 30% Secundária: Superfícies de Cartões, Linhas de Divisão e Metadados (Pearl Beige & On-Surface-Variant) */
  secondary30: {
    card: 'bg-[#1B1A1B] border-[#E5D5B3]/15',
    elevated: 'bg-[#171617] border-[#E5D5B3]/15',
    border: 'border-[#E5D5B3]/15',
    divider: 'divide-[#E5D5B3]/20',
    textSecondary: 'text-[#E5D5B3]',
    textMuted: 'text-[#BDBAB5]'
  },
  /** 10% Acento: Deep Teal (#607466 / #748B7B / #243028) */
  accent10: {
    primaryCta: 'bg-[#607466] hover:bg-[#748B7B] text-[#FFFCF2]',
    activeTab: 'bg-[#607466]/25 border border-[#607466]/40 text-[#FFFCF2]',
    badgeContainer: 'bg-[#243028] text-[#E5D5B3] border border-[#607466]/30',
    highlight: 'text-[#748B7B]'
  },
  /** Tipografia Editorial: Newsreader (Display/Headlines) + Inter (Body/Labels) em Floral White (#FFFCF2) */
  typography: {
    display: 'font-display text-[#FFFCF2]',
    subheading: 'font-display text-subheading text-[#FFFCF2]',
    bodyPrimary: 'font-body-md text-[#FFFCF2]',
    bodySecondary: 'font-body-sm text-[#BDBAB5]'
  }
} as const
