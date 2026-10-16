export interface FetchResult {
  html: string
  statusCode: number
}

const CUSTOM_USER_AGENT =
  'InfoConcursos/1.0 (Desktop; Open Source Concursos Research; +https://github.com/infoconcursos)'

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': CUSTOM_USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8'
}

const MAX_BYTES = 2 * 1024 * 1024 // 2 Megabytes

/**
 * Executa requisição HTTP segura com timeout garantido em finally, limite de bytes e tratamento de erros.
 */
export async function fetchHtmlWithSafety(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<FetchResult | null> {
  const timeoutMs = options.timeoutMs ?? 6000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        ...(options.headers || {})
      },
      signal: controller.signal
    })

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
