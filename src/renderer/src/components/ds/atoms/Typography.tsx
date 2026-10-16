import React from 'react'

export interface HeadingProps {
  level?: 1 | 2 | 3 | 4
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

export function Heading({
  level = 2,
  children,
  className = '',
  icon
}: HeadingProps): React.JSX.Element {
  if (level === 1) {
    return (
      <h1
        className={`font-display text-3xl sm:text-4xl lg:text-display leading-[1.12] text-[#FFFCF2] tracking-tight flex items-center gap-2.5 ${className}`}
      >
        {icon}
        <span>{children}</span>
      </h1>
    )
  }
  if (level === 2) {
    return (
      <h2
        className={`font-display text-headline-md text-[#FFFCF2] tracking-tight flex items-center gap-2.5 ${className}`}
      >
        {icon}
        <span>{children}</span>
      </h2>
    )
  }
  if (level === 3) {
    return (
      <h3
        className={`font-display text-xl sm:text-2xl text-[#FFFCF2] leading-snug flex items-center gap-2 ${className}`}
      >
        {icon}
        <span>{children}</span>
      </h3>
    )
  }
  return (
    <h4
      className={`font-label-sm text-label-sm uppercase tracking-widest text-[#E5D5B3] font-semibold flex items-center gap-2 ${className}`}
    >
      {icon}
      <span>{children}</span>
    </h4>
  )
}

export interface TextProps {
  variant?: 'primary' | 'secondary' | 'muted' | 'caption'
  children: React.ReactNode
  className?: string
}

export function Text({
  variant = 'secondary',
  children,
  className = ''
}: TextProps): React.JSX.Element {
  const variantMap = {
    primary: 'font-body-md text-base text-[#FFFCF2] leading-relaxed',
    secondary: 'font-body-sm text-body-sm text-[#BDBAB5] leading-relaxed',
    muted: 'font-body-sm text-body-sm text-[#BDBAB5]/80',
    caption: 'font-label-sm text-label-sm text-[#BDBAB5]'
  }
  return <p className={`${variantMap[variant]} ${className}`}>{children}</p>
}

export function Divider({ className = '' }: { className?: string }): React.JSX.Element {
  return <hr className={`border-0 border-t border-[#E5D5B3]/10 my-space-md ${className}`} />
}
