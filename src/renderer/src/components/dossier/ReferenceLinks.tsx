import React from 'react'
import { ExternalLink } from 'lucide-react'
import { ReferenceLink } from '../../../../shared/types/concurso'
import { Heading, Text, ReferenceLinkRow } from '../ds'

interface ReferenceLinksProps {
  links: ReferenceLink[]
}

export function ReferenceLinks({ links }: ReferenceLinksProps): React.JSX.Element {
  const handleOpenLink = (url: string): void => {
    window.api.openExternalUrl(url)
  }

  return (
    <section className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5D5B3]/10">
        <Heading level={4} icon={<ExternalLink className="w-4 h-4 text-[#748B7B]" />}>
          Fontes Primárias & Atos Oficiais Verificados
        </Heading>
        <Text variant="caption">Conferência direta nos portais institucionais e bancas</Text>
      </div>

      <div className="space-y-space-sm">
        {links.map((link) => (
          <ReferenceLinkRow key={link.id} link={link} onOpen={handleOpenLink} />
        ))}
      </div>
    </section>
  )
}
