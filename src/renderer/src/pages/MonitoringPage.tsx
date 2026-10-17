import React from 'react'
import {
  BellRing,
  RefreshCw,
  Trash2,
  ArrowRight,
  Sparkles,
  Clock
} from 'lucide-react'
import { MonitoringItem } from '../../../shared/types/news'
import { STATUS_DISPLAY_MAP } from '../../../shared/types/search'
import { Button, Badge, Heading, Text, BadgeTone } from '../components/ds'

interface MonitoringPageProps {
  items: MonitoringItem[]
  isChecking: boolean
  onCheckUpdatesNow: () => void
  onOpenDossier: (item: MonitoringItem) => void
  onRemoveMonitored: (id: string) => void
}

export function MonitoringPage({
  items,
  isChecking,
  onCheckUpdatesNow,
  onOpenDossier,
  onRemoveMonitored
}: MonitoringPageProps): React.JSX.Element {

  return (
    <div className="space-y-space-lg py-space-lg">
      {/* Cabeçalho Editorial de Acompanhamentos */}
      <div className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#607466]" />
            <Heading level={2}>Radar Pessoal de Acompanhamentos</Heading>
          </div>
          <Text variant="caption">
            Certames monitorados localmente em SQLite. Verifique com 1 clique novas movimentações, bancas contratadas ou retificações.
          </Text>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={items.length === 0}
          isLoading={isChecking}
          onClick={onCheckUpdatesNow}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {isChecking ? 'Consultando Fontes...' : 'Verificar Atualizações Agora'}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-12 text-center space-y-4 shadow-sm">
          <div className="w-11 h-11 rounded-full bg-[#243028] border border-[#607466]/40 flex items-center justify-center mx-auto text-[#748B7B]">
            <BellRing className="w-5 h-5" />
          </div>
          <Heading level={3} className="justify-center">
            Nenhum edital ou órgão em acompanhamento
          </Heading>
          <Text variant="secondary" className="mx-auto max-w-lg">
            Utilize a seção &ldquo;Busca &amp; Dossiês&rdquo; para consultar um certame e clique em &ldquo;Acompanhar&rdquo; para ativar o radar de mudanças.
          </Text>
        </div>
      ) : (
        /* Lista Linear Estilo Monocle com Divisores Hairline */
        <div className="w-full bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl divide-y divide-[#E5D5B3]/20 shadow-sm overflow-hidden">
          {items.map((item) => {
            const statusStyle = STATUS_DISPLAY_MAP[item.statusAtual] || STATUS_DISPLAY_MAP.PREVISTO
            const toneMap: Record<typeof statusStyle.semanticTone, BadgeTone> = {
              success: 'success',
              warning: 'gold',
              accent: 'accent',
              neutral: 'neutral'
            }
            return (
              <article
                key={item.id}
                className="p-space-lg hover:bg-[#1E1D1E]/80 transition-colors group"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-baseline">
                  {/* Coluna 1: Status & Data */}
                  <div className="lg:col-span-3 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={toneMap[statusStyle.semanticTone]}>
                        {item.statusLabel}
                      </Badge>
                      {item.possuiNovidade && (
                        <Badge tone="info" icon={<Sparkles className="w-3 h-3" />}>
                          Nova Movimentação
                        </Badge>
                      )}
                    </div>
                    <span className="font-label-sm text-label-sm text-[#BDBAB5] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#748B7B]" />
                      Checado: {new Date(item.ultimaVerificacao).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Coluna 2: Título e Descrição */}
                  <div
                    onClick={() => onOpenDossier(item)}
                    className="lg:col-span-6 space-y-1 cursor-pointer"
                  >
                    <h3 className="font-display text-xl sm:text-2xl leading-snug">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDossier(item)
                        }}
                        className="text-left text-[#FFFCF2] group-hover:text-[#E5D5B3] transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#748B7B]"
                      >
                        {item.tituloConcurso}
                      </button>
                    </h3>
                    {item.descricaoNovidade && (
                      <p className="font-body-sm text-body-sm text-[#BDBAB5] leading-relaxed">
                        {item.descricaoNovidade}
                      </p>
                    )}
                  </div>

                  {/* Coluna 3: Ações */}
                  <div className="lg:col-span-3 flex lg:justify-end items-center gap-2 pt-2 lg:pt-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenDossier(item)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[#748B7B]" />}
                    >
                      Abrir Dossiê
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      title="Remover acompanhamento"
                      aria-label={`Remover acompanhamento de ${item.tituloConcurso}`}
                      onClick={() => onRemoveMonitored(item.id)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
