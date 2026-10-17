import { buildPrivacyPreservingHeaders } from '../privacy/network-privacy'

export interface FetchResult {
  html: string
  statusCode: number
}

const MAX_BYTES = 2 * 1024 * 1024 // 2 Megabytes

/**
 * Executa requisição HTTP segura com timeout garantido em finally, limite de bytes,
 * cabeçalhos de privacidade (Sec-GPC, DNT, no-referrer, sem cookies) e roteamento seguro
 * via proxy nativo do Electron/Chromium (session.defaultSession.setProxy).
 */
export async function fetchHtmlWithSafety(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<FetchResult | null> {
  const timeoutMs = options.timeoutMs ?? 6000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const requestInit: RequestInit = {
      headers: buildPrivacyPreservingHeaders(options.headers),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    }

    const res = await fetch(url, requestInit)

    if (!res.ok) {
      return null
    }

    const contentType = res.headers.get('content-type') || ''
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('application/xml') &&
      !contentType.includes('text/xml') &&
      !contentType.includes('application/xhtml')
    ) {
      // Rejeita downloads binários pesados
      return null
    }

    const text = await res.text()
    if (text.length > MAX_BYTES) {
      return { html: text.slice(0, MAX_BYTES), statusCode: res.status }
    }

    return { html: text, statusCode: res.status }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
