import React from 'react'

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
}

export function TextInput({
  leftIcon,
  className = '',
  ...props
}: TextInputProps): React.JSX.Element {
  return (
    <div className="relative w-full">
      {leftIcon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#748B7B] pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        className={`w-full h-10 ${
          leftIcon ? 'pl-10' : 'pl-4'
        } pr-4 rounded-lg bg-[#171617] border border-[#E5D5B3]/15 font-body-sm text-body-sm text-[#FFFCF2] placeholder:text-[#BDBAB5]/60 focus:outline-none focus:border-[#748B7B] focus:ring-1 focus:ring-[#607466] transition-all ${className}`}
        {...props}
      />
    </div>
  )
}

export interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  leftIcon?: React.ReactNode
}

export function SelectInput({
  leftIcon,
  className = '',
  children,
  ...props
}: SelectInputProps): React.JSX.Element {
  return (
    <div className="relative w-full">
      {leftIcon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#748B7B] pointer-events-none">
          {leftIcon}
        </span>
      )}
      <select
        className={`w-full h-10 ${
          leftIcon ? 'pl-10' : 'pl-4'
        } pr-3 rounded-lg bg-[#171617] border border-[#E5D5B3]/15 font-body-sm text-body-sm text-[#FFFCF2] focus:outline-none focus:border-[#748B7B] focus:ring-1 focus:ring-[#607466] transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
