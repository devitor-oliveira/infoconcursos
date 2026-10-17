import React from 'react'
import { ExternalLink, Newspaper, ShieldCheck } from 'lucide-react'
import { ReferenceLink } from '../../../../shared/types/concurso'
import { Heading, Text, ReferenceLinkRow } from '../ds'

interface ReferenceLinksProps {
  links: ReferenceLink[]
}

export function ReferenceLinks({ links }: ReferenceLinksProps): React.JSX.Element {
  const handleOpenLink = (url: string): void => {
    window.api.openExternalUrl(url)
  }

  const officialSources = links.filter(
    (l) => l.tipo === 'BANCA' || l.tipo === 'PORTAL_OFICIAL' || l.tipo === 'EDITAL_PDF'
  )
  const journalisticCoverage = links.filter((l) => l.tipo === 'NOTICIA' || !l.tipo)

  return (
    <section className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg space-y-6">
      {/* Nível 1: Fontes Oficiais & Atos Verificados */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5D5B3]/10">
          <Heading level={4} icon={<ShieldCheck className="w-4 h-4 text-[#748B7B]" />}>
            Fontes Oficiais & Atos Verificados
          </Heading>
          <Text variant="caption">Portais de organizadoras, diários oficiais e atos normativos</Text>
        </div>

        <div className="space-y-space-sm">
          {officialSources.length > 0 ? (
            officialSources.map((link) => (
              <ReferenceLinkRow key={link.id} link={link} onOpen={handleOpenLink} />
            ))
          ) : (
            <div className="p-3 text-xs text-[#BDBAB5] bg-[#171617] rounded-lg border border-[#E5D5B3]/10">
              Aguardando vinculação com Diário Oficial do respectivo ente federativo.
            </div>
          )}
        </div>
      </div>

      {/* Nível 2: Cobertura Jornalística & Agregadores */}
      {journalisticCoverage.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[#E5D5B3]/10">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <Heading level={4} icon={<Newspaper className="w-4 h-4 text-[#E5D5B3]" />}>
              Cobertura Jornalística & Agregadores
            </Heading>
            <Text variant="caption">Apurações da imprensa especializada e portais catalogados</Text>
          </div>

          <div className="space-y-space-sm">
            {journalisticCoverage.map((link) => (
              <ReferenceLinkRow key={link.id} link={link} onOpen={handleOpenLink} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
