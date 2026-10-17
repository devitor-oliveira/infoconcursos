import { anonymizeText } from '../../../shared/utils/anonymizer'

export interface NetworkPrivacyConfig {
  proxyEnabled: boolean
  proxyUrl: string
  rotateUserAgent: boolean
  sendGlobalPrivacyControl: boolean
}

export interface NetworkPrivacyStatus extends NetworkPrivacyConfig {
  activeDispatcherType: 'ELECTRON_NATIVE_PROXY' | 'DIRECT_PRIVACY_HARDENED'
  maskedProxyUrl: string
  encryptionAlgorithm: 'AES-256-GCM'
}

// Perfis de User-Agent reduzidos (W3C User-Agent Reduction) para evitar fingerprinting de dispositivo
const REDUCED_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
]

let uaRotationIndex = 0

const currentConfig: NetworkPrivacyConfig = {
  proxyEnabled: Boolean(
    process.env.INFOCONCURSOS_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  ),
  proxyUrl: (
    process.env.INFOCONCURSOS_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    ''
  ).trim(),
  rotateUserAgent: true,
  sendGlobalPrivacyControl: true
}

/**
 * Valida se uma URL de proxy HTTP/HTTPS é segura e sintaticamente válida.
 */
export function validateProxyUrl(rawUrl: string): {
  valid: boolean
  normalizedUrl: string
  error?: string
} {
  const trimmed = (rawUrl || '').trim()
  if (!trimmed) {
    return { valid: true, normalizedUrl: '' }
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalizedUrl: '',
        error: 'Apenas protocolos de proxy http:// ou https:// são suportados pelo cliente.'
      }
    }
    if (!parsed.hostname) {
      return {
        valid: false,
        normalizedUrl: '',
        error: 'Endereço de host do proxy inválido.'
      }
    }
    return { valid: true, normalizedUrl: parsed.toString().replace(/\/+$/, '') }
  } catch {
    return {
      valid: false,
      normalizedUrl: '',
      error: 'Formato de URL de proxy inválido. Exemplo válido: http://127.0.0.1:8080'
    }
  }
}

/**
 * Aplica a configuração de proxy diretamente à sessão padrão do Electron (Chromium Network Stack)
 * utilizando a API oficial session.defaultSession.setProxy({ proxyRules, proxyBypassRules }).
 * Documentação Oficial: https://www.electronjs.org/docs/latest/api/session#sessetproxyconfig
 */
export async function applyElectronSessionProxy(): Promise<void> {
  try {
    if (process.versions && process.versions.electron) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { session } = require('electron')
      if (session && session.defaultSession) {
        if (currentConfig.proxyEnabled && currentConfig.proxyUrl) {
          await session.defaultSession.setProxy({
            mode: 'fixed_servers',
            proxyRules: currentConfig.proxyUrl,
            proxyBypassRules: '<local>,localhost,127.0.0.1'
          })
        } else {
          await session.defaultSession.setProxy({
            mode: 'direct'
          })
        }
      }
    }
  } catch (err) {
    console.warn('[NetworkPrivacy] Falha ao aplicar proxy na sessão Electron:', err)
  }
}

/**
 * Atualiza a configuração de privacidade de rede e sincroniza com a sessão Chromium nativa do Electron.
 */
export function configureNetworkPrivacy(partial: Partial<NetworkPrivacyConfig>): {
  success: boolean
  error?: string
  status: NetworkPrivacyStatus
} {
  if (partial.proxyUrl !== undefined) {
    const check = validateProxyUrl(partial.proxyUrl)
    if (!check.valid) {
      return {
        success: false,
        error: check.error,
        status: getNetworkPrivacyStatus()
      }
    }
    currentConfig.proxyUrl = check.normalizedUrl
  }

  if (partial.proxyEnabled !== undefined) {
    currentConfig.proxyEnabled = Boolean(partial.proxyEnabled) && Boolean(currentConfig.proxyUrl)
  } else if (!currentConfig.proxyUrl) {
    currentConfig.proxyEnabled = false
  }

  if (partial.rotateUserAgent !== undefined) {
    currentConfig.rotateUserAgent = Boolean(partial.rotateUserAgent)
  }

  if (partial.sendGlobalPrivacyControl !== undefined) {
    currentConfig.sendGlobalPrivacyControl = Boolean(partial.sendGlobalPrivacyControl)
  }

  // Despacha assincronamente a atualização para o motor de rede Chromium do Electron
  applyElectronSessionProxy().catch(() => {})

  return {
    success: true,
    status: getNetworkPrivacyStatus()
  }
}

/**
 * Gera cabeçalhos HTTP focados em privacidade, redução de fingerprinting e bloqueio de rastreamento:
 * - User-Agent Reduction com rotação de perfis padronizados
 * - Global Privacy Control (Sec-GPC: 1) e Do Not Track (DNT: 1)
 * - Desativação de cache de rastreamento (ETag tracking)
 */
export function buildPrivacyPreservingHeaders(
  customHeaders?: Record<string, string>
): Record<string, string> {
  const ua = currentConfig.rotateUserAgent
    ? REDUCED_USER_AGENTS[uaRotationIndex++ % REDUCED_USER_AGENTS.length]
    : REDUCED_USER_AGENTS[0]

  const headers: Record<string, string> = {
    'User-Agent': ua,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache'
  }

  if (currentConfig.sendGlobalPrivacyControl) {
    headers['DNT'] = '1'
    headers['Sec-GPC'] = '1'
  }

  return {
    ...headers,
    ...(customHeaders || {})
  }
}

/**
 * Retorna o status atual de segurança de rede e mascaramento de IP (com credenciais anonimizadas).
 */
export function getNetworkPrivacyStatus(): NetworkPrivacyStatus {
  const hasActiveProxy = Boolean(currentConfig.proxyEnabled && currentConfig.proxyUrl)
  return {
    ...currentConfig,
    proxyEnabled: hasActiveProxy,
    activeDispatcherType: hasActiveProxy ? 'ELECTRON_NATIVE_PROXY' : 'DIRECT_PRIVACY_HARDENED',
    maskedProxyUrl: currentConfig.proxyUrl
      ? anonymizeText(currentConfig.proxyUrl, 'LOG_OUTPUT')
      : '',
    encryptionAlgorithm: 'AES-256-GCM'
  }
}
