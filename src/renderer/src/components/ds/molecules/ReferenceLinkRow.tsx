import React from 'react'
import { ArrowRight, Globe, FileText, Newspaper, Building2 } from 'lucide-react'
import { ReferenceLink } from '../../../../../shared/types/concurso'
import { Badge, BadgeTone } from '../atoms/Badge'

export interface ReferenceLinkRowProps {
  link: ReferenceLink
  onOpen: (url: string) => void
}

export function ReferenceLinkRow({ link, onOpen }: ReferenceLinkRowProps): React.JSX.Element {
  const getMeta = (
    tipo: ReferenceLink['tipo']
  ): { label: string; icon: React.ReactNode; tone: BadgeTone } => {
    switch (tipo) {
      case 'PORTAL_OFICIAL':
        return {
          label: 'Portal Oficial',
          icon: <Globe className="w-3 h-3" />,
          tone: 'success'
        }
      case 'BANCA':
        return {
          label: 'Página da Banca',
          icon: <Building2 className="w-3 h-3" />,
          tone: 'gold'
        }
      case 'EDITAL_PDF':
        return {
          label: 'Documento / Ato',
          icon: <FileText className="w-3 h-3" />,
          tone: 'accent'
        }
      default:
        return {
          label: 'Apuração Editorial',
          icon: <Newspaper className="w-3 h-3" />,
          tone: 'neutral'
        }
    }
  }

  const meta = getMeta(link.tipo)

  return (
    <button
      type="button"
      onClick={() => onOpen(link.url)}
      className="ds-container-inline w-full text-left p-space-md rounded-lg bg-[#171617] hover:bg-[#1E1D1E] border border-[#E5D5B3]/15 hover:border-[#748B7B]/40 transition-colors flex flex-col ds-cq-row justify-between gap-4 group cursor-pointer"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge tone={meta.tone} icon={meta.icon}>
            {meta.label}
          </Badge>
          <span className="font-label-sm text-label-sm text-[#E5D5B3] truncate">{link.fonte}</span>
        </div>
        <p className="font-display text-lg text-[#FFFCF2] group-hover:text-[#E5D5B3] transition-colors truncate">
          {link.titulo}
        </p>
      </div>

      <div className="flex items-center gap-1 font-label-sm text-label-sm font-semibold text-[#748B7B] group-hover:translate-x-1 transition-transform shrink-0">
        <span>Conferir Fonte</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </button>
  )
}
