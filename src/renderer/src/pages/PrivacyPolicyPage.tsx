import React, { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Lock,
  Globe,
  Trash2,
  CheckCircle2,
  EyeOff,
  Server,
  FileCheck2,
  AlertTriangle
} from 'lucide-react'
import { Button, TextInput, Badge } from '../components/ds'
import { useAppStore } from '../stores/monitoringStore'
import { PrivacySecurityStatus } from '../../../preload/index'

export function PrivacyPolicyPage(): React.JSX.Element {
  const { clearLocalCacheAndHistory } = useAppStore()
  const [securityStatus, setSecurityStatus] = useState<PrivacySecurityStatus | null>(null)
  const [proxyInput, setProxyInput] = useState<string>('')
  const [proxyEnabled, setProxyEnabled] = useState<boolean>(false)
  const [proxyFeedback, setProxyFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null)
  const [isPurging, setIsPurging] = useState<boolean>(false)

  useEffect(() => {
    window.api
      .getPrivacyStatus()
      .then((status) => {
        setSecurityStatus(status)
        setProxyInput(status.network.proxyUrl || '')
        setProxyEnabled(status.network.proxyEnabled)
      })
      .catch(() => {
        // Ignora caso chamado fora do IPC
      })
  }, [])

  const handleSaveProxyConfig = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setProxyFeedback(null)

    const trimmedUrl = proxyInput.trim()
    const shouldEnable = Boolean(trimmedUrl) && proxyEnabled

    try {
      const res = await window.api.configureNetworkPrivacy({
        proxyUrl: trimmedUrl,
        proxyEnabled: shouldEnable
      })
      if (!res.success) {
        setProxyFeedback({
          type: 'error',
          text: res.error || 'URL de proxy inválida.'
        })
        return
      }
      const updated = await window.api.getPrivacyStatus()
      setSecurityStatus(updated)
      setProxyEnabled(updated.network.proxyEnabled)
      setProxyFeedback({
        type: 'success',
        text: updated.network.proxyEnabled
          ? `Mascaramento de IP via Proxy (${updated.network.maskedProxyUrl}) ativado para todas as buscas.`
          : 'Conexão direta com cabeçalhos de privacidade (Sec-GPC, sem cookies e no-referrer) aplicada.'
      })
    } catch {
      setProxyFeedback({
        type: 'error',
        text: 'Erro ao aplicar configuração de proxy.'
      })
    }
  }

  const handlePurgeLocalData = async (): Promise<void> => {
    setIsPurging(true)
    const res = await clearLocalCacheAndHistory()
    setIsPurging(false)
    if (res) {
      setPurgeFeedback(
        `Dados locais expurgados com comando SQLite VACUUM e recriptografados (AES-256-GCM) às ${new Date(res.clearedAt).toLocaleTimeString('pt-BR')}.`
      )
    }
  }

  return (
    <div className="w-full space-y-6 pb-16 pt-2">
      {/* Cabeçalho da Página */}
      <div className="border-b border-[#E5D5B3]/15 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#748B7B]" />
              <h1 className="font-display text-2xl lg:text-3xl text-[#FFFCF2]">
                Política de Privacidade, Segurança &amp; Conformidade LGPD
              </h1>
            </div>
            <p className="font-body-sm text-sm text-[#BDBAB5]">
              Diretrizes transparentes de proteção de dados (Lei Federal nº 13.709/2018), criptografia local em repouso e controles de rede do InfoConcursos Desktop.
            </p>
          </div>

          <Badge tone="accent">Zero Coleta Pessoal • AES-256-GCM</Badge>
        </div>
      </div>

      {/* Resumo Objetivo dos 4 Pilares Legais */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#FFFCF2] font-display text-lg">
            <FileCheck2 className="w-5 h-5 text-[#748B7B]" />
            <h2>1. Natureza Pública dos Dados (Art. 37 CF/88 e LAI)</h2>
          </div>
          <p className="text-xs leading-relaxed text-[#BDBAB5]">
            O aplicativo consulta e estrutura exclusivamente <strong className="text-[#FFFCF2]">atos administrativos oficiais</strong> de órgãos públicos e bancas examinadoras (editais, cargos, vagas, salários e disciplinas), regidos pelo princípio constitucional da publicidade e pela Lei de Acesso à Informação (Lei nº 12.527/2011).
          </p>
        </div>

        <div className="p-5 bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#FFFCF2] font-display text-lg">
            <EyeOff className="w-5 h-5 text-[#748B7B]" />
            <h2>2. Zero Dados Pessoais &amp; Anonimização (Art. 6º, III LGPD)</h2>
          </div>
          <p className="text-xs leading-relaxed text-[#BDBAB5]">
            Não exigimos cadastro, login, nome, CPF ou e-mail, nem enviamos telemetria para nuvem. O motor conta com um <strong className="text-[#FFFCF2]">módulo de anonimização contextual</strong> que bloqueia buscas com dados pessoais e mascara automaticamente CPFs, e-mails, telefones ou menções nominais em textos coletados antes de qualquer gravação local.
          </p>
        </div>

        <div className="p-5 bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#FFFCF2] font-display text-lg">
            <Lock className="w-5 h-5 text-[#748B7B]" />
            <h2>3. Criptografia Local em Repouso (Art. 46 LGPD)</h2>
          </div>
          <p className="text-xs leading-relaxed text-[#BDBAB5]">
            O cache de certames e os acompanhamentos ficam restritos ao seu computador no arquivo <code className="text-[#E5D5B3]">infoconcursos.db</code>, cifrado integralmente com <strong className="text-[#FFFCF2]">AES-256-GCM</strong> (Criptografia Autenticada NIST SP 800-38D) e chave protegida pelo cofre do sistema operacional (<code className="text-[#E5D5B3]">safeStorage / DPAPI</code>).
          </p>
        </div>

        <div className="p-5 bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-[#FFFCF2] font-display text-lg">
            <Globe className="w-5 h-5 text-[#748B7B]" />
            <h2>4. Transparência de Rede &amp; Mascaramento de IP (Art. 9º LGPD)</h2>
          </div>
          <p className="text-xs leading-relaxed text-[#BDBAB5]">
            Quando você realiza uma atualização online, o aplicativo consulta diretamente os portais públicos sem enviar cookies (<code className="text-[#E5D5B3]">credentials: omit</code>), sem cabeçalho <code className="text-[#E5D5B3]">Referer</code>, com sinal <code className="text-[#E5D5B3]">Sec-GPC: 1</code> e User-Agent reduzido. Você também pode ativar abaixo um <strong className="text-[#FFFCF2]">Proxy HTTP/HTTPS</strong> para mascarar seu endereço IP.
          </p>
        </div>
      </section>

      {/* Controle de Proxy e Mascaramento de IP (Undici ProxyAgent) */}
      <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl p-5 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5D5B3]/10">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#748B7B]" />
            <h2 className="font-display text-xl text-[#FFFCF2]">
              Segurança de Rede &amp; Mascaramento de IP via Proxy
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded bg-[#243028] border border-[#607466]/40 text-[11px] font-label-sm text-[#E5D5B3]">
            {securityStatus?.network.activeDispatcherType === 'ELECTRON_NATIVE_PROXY' ||
            securityStatus?.network.activeDispatcherType === 'PROXY_AGENT_UNDICI'
              ? `Proxy Ativo: ${securityStatus.network.maskedProxyUrl}`
              : 'Modo Direto Protegido (Sec-GPC + No-Cookies)'}
          </span>
        </div>

        <form onSubmit={handleSaveProxyConfig} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-8 space-y-1.5">
              <label
                htmlFor="proxy-url-input"
                className="block font-label-sm text-xs text-[#E5D5B3]"
              >
                Endereço do Servidor Proxy HTTP/HTTPS (Opcional — Chromium / Electron Proxy)
              </label>
              <TextInput
                id="proxy-url-input"
                name="proxyUrl"
                type="url"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-describedby="proxy-url-help"
                value={proxyInput}
                onChange={(e) => {
                  setProxyInput(e.target.value)
                  setProxyFeedback(null)
                }}
                placeholder="Ex: http://127.0.0.1:8080 ou http://gateway-proxy.local:3128"
              />
              <p id="proxy-url-help" className="text-[11px] text-[#BDBAB5]">
                Ao informar um proxy e ativar a chave ao lado, todas as buscas externas são tuneladas pelo agente de proxy, ocultando o seu endereço IP residencial/corporativo dos sites consultados.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-wrap items-center justify-end gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-[#FFFCF2] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={proxyEnabled}
                  onChange={(e) => setProxyEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#607466] rounded cursor-pointer"
                />
                <span>Ativar Roteamento via Proxy</span>
              </label>

              <Button type="submit" variant="primary" size="md">
                Salvar Rede
              </Button>
            </div>
          </div>

          <div aria-live="polite" role="status">
            {proxyFeedback && (
              <div
                className={`rounded-lg px-3.5 py-2.5 text-xs flex items-center gap-2 border ${
                  proxyFeedback.type === 'success'
                    ? 'bg-[#243028]/70 border-[#607466]/50 text-[#FFFCF2]'
                    : 'bg-[#2A1B1B] border-[#E5D5B3]/30 text-[#E5D5B3]'
                }`}
              >
                {proxyFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#748B7B] shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#E5D5B3] shrink-0" />
                )}
                <span>{proxyFeedback.text}</span>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* Direito de Eliminação e Controle de Dados Locais (Art. 18, VI LGPD) */}
      <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl p-5 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display text-xl text-[#FFFCF2]">
              Direito de Eliminação &amp; Expurgo do Banco Local (Art. 18, VI da LGPD)
            </h2>
            <p className="text-xs text-[#BDBAB5] max-w-3xl">
              Você pode eliminar a qualquer instante todo o histórico de termos pesquisados, o cache de dossiês e as notícias armazenadas localmente. A exclusão executa o comando <code className="text-[#E5D5B3]">VACUUM</code> no SQLite para zerar páginas livres em memória antes de recriptografar o arquivo em disco.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            isLoading={isPurging}
            onClick={handlePurgeLocalData}
            leftIcon={<Trash2 className="w-4 h-4 text-[#E5D5B3]" />}
          >
            Expurgar Cache e Histórico Local Agora
          </Button>
        </div>

        <div aria-live="polite" role="status">
          {purgeFeedback && (
            <div className="rounded-lg bg-[#243028]/80 border border-[#607466]/50 px-4 py-2.5 text-xs text-[#FFFCF2] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#748B7B] shrink-0" />
              <span>{purgeFeedback}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
