import React from 'react'

export interface FilterChipProps {
  label: string
  active?: boolean
  tone?: 'teal' | 'beige' | 'paprika'
  title?: string
  onClick: () => void
}

export function FilterChip({
  label,
  active = false,
  tone = 'teal',
  title,
  onClick
}: FilterChipProps): React.JSX.Element {
  const activeCls =
    tone === 'beige'
      ? 'bg-[#243028] border-[#607466]/45 text-[#E5D5B3] font-medium shadow-sm'
      : 'bg-[#607466] border-[#748B7B]/40 text-[#FFFCF2] font-medium shadow-sm hover:bg-[#748B7B]'

  const inactiveCls =
    'bg-transparent text-[#BDBAB5] hover:text-[#FFFCF2] hover:bg-[#1E1D1E] border-transparent hover:border-[#E5D5B3]/15'

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md border transition-all duration-150 cursor-pointer inline-flex items-center justify-center shrink-0 ${
        active ? activeCls : inactiveCls
      }`}
    >
      {label}
    </button>
  )
}
