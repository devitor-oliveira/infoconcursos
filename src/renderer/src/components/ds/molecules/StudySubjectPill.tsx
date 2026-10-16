import React from 'react'
import { CheckCircle2 } from 'lucide-react'

export interface StudySubjectPillProps {
  subject: string
}

export function StudySubjectPill({ subject }: StudySubjectPillProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#171617] border border-[#E5D5B3]/15 font-body-sm text-body-sm text-[#FFFCF2]">
      <CheckCircle2 className="w-4 h-4 text-[#748B7B] shrink-0 mt-0.5" />
      <span>{subject}</span>
    </div>
  )
}
