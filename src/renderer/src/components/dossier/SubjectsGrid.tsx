import React from 'react'
import { BookOpen } from 'lucide-react'
import { Heading, Text, Badge, StudySubjectPill } from '../ds'

interface SubjectsGridProps {
  subjects: string[]
}

export function SubjectsGrid({ subjects }: SubjectsGridProps): React.JSX.Element {
  return (
    <section className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5D5B3]/10">
        <Heading level={4} icon={<BookOpen className="w-4 h-4 text-[#748B7B]" />}>
          Disciplinas Nucleares • Estudo Preliminar Recomendado
        </Heading>
        <Badge tone="gold">Matriz Base da Carreira</Badge>
      </div>

      <Text variant="caption">
        Eixo programático recorrente nos editais da instituição para estruturação imediata de ciclo de estudos:
      </Text>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-sm">
        {subjects.map((subject, idx) => (
          <StudySubjectPill key={`${subject}-${idx}`} subject={subject} />
        ))}
      </div>
    </section>
  )
}
