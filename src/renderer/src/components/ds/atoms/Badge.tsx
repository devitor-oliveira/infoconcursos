import React from 'react'

export type BadgeTone = 'neutral' | 'accent' | 'gold' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps {
  tone?: BadgeTone
  icon?: React.ReactNode
  pulseDot?: boolean
  children: React.ReactNode
  className?: string
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  // Estilo Editorial do Modelo de Referência
  neutral: 'bg-[#171617] border-[#E5D5B3]/15 text-[#BDBAB5]',
  accent: 'bg-[#243028] border-[#607466]/30 text-[#748B7B]',
  gold: 'bg-[#243028] border-[#607466]/30 text-[#E5D5B3]',
  success: 'bg-[#243028] border-[#607466]/40 text-[#E5D5B3]',
  warning: 'bg-[#1E1D1E] border-[#E5D5B3]/25 text-[#E5D5B3]',
  danger: 'bg-semantic-danger/15 border-semantic-danger/35 text-semantic-danger',
  info: 'bg-[#243028] border-[#748B7B]/40 text-[#FFFCF2]'
}

export function Badge({
  tone = 'neutral',
  icon,
  pulseDot = false,
  children,
  className = ''
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border font-label-sm text-label-sm uppercase tracking-widest font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {pulseDot && <span className="w-1.5 h-1.5 rounded-full bg-[#748B7B] animate-pulse shrink-0" />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
