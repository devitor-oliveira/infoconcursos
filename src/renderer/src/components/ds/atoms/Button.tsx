import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isLoading?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // 10% Acento Primário: Deep Teal (#607466 -> #748B7B)
  primary:
    'bg-[#607466] hover:bg-[#748B7B] active:bg-[#243028] text-[#FFFCF2] border-[#748B7B]/30 shadow-sm',
  // 30% Secundária: Surface Container (#1E1D1E -> #262527) & Pearl Beige
  secondary:
    'bg-[#1E1D1E] hover:bg-[#262527] active:bg-[#171617] text-[#E5D5B3] border-[#E5D5B3]/20 hover:border-[#E5D5B3]/35',
  // Outline Editorial
  outline:
    'bg-transparent hover:bg-[#1E1D1E] text-[#FFFCF2] border-[#E5D5B3]/20 hover:border-[#748B7B]/60',
  // Ghost Minimalista
  ghost:
    'bg-transparent hover:bg-[#1E1D1E] text-[#BDBAB5] hover:text-[#FFFCF2] border-transparent',
  // Danger
  danger:
    'bg-[#171617] hover:bg-semantic-danger/15 text-[#BDBAB5] hover:text-semantic-danger border-[#E5D5B3]/15 hover:border-semantic-danger/40',
  // Success / Acompanhando (Tertiary Container #243028 + #748B7B)
  success:
    'bg-[#243028] hover:bg-[#607466]/35 text-[#E5D5B3] border-[#607466]/45'
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 gap-1.5 font-label-sm text-label-sm rounded-lg',
  md: 'px-space-md py-2 gap-2 font-label-md text-label-md font-semibold rounded-lg',
  lg: 'px-space-lg py-2.5 gap-2.5 font-label-lg text-label-lg font-semibold rounded-lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon}
    </button>
  )
}
