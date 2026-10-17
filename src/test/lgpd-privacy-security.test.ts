import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initDatabase,
  closeDatabase,
  purgeLocalCacheAndHistory,
  getDb
} from '../main/database'
import {
  isEncryptedDatabaseBuffer,
  encryptDatabaseBuffer,
  decryptDatabaseBuffer,
  resolveDatabaseMasterKey
} from '../main/database/crypto-storage'
import {
  historicoBuscasTable,
  buscaCacheTable,
  concursosTable,
  noticiasTable
} from '../main/database/schema'
import {
  detectPersonalData,
  anonymizeText,
  validateAndSanitizeSearchFilter
} from '../shared/utils/anonymizer'
import {
  configureNetworkPrivacy,
  buildPrivacyPreservingHeaders,
  getNetworkPrivacyStatus
} from '../main/modules/privacy/network-privacy'
import {
  saveSearchResultsToCache,
  saveNewsToCache,
  getCachedSearchResults
} from '../main/modules/search/search-cache-service'
import { generateConcursoDossiers } from '../main/modules/dossier/dossier-generator'
import { fetchHtmlWithSafety } from '../main/modules/search/http-client'
import { ConcursoDossier } from '../shared/types/concurso'

describe('LGPD, Privacidade, Segurança e Criptografia AES-256-GCM', () => {
  beforeEach(async () => {
    closeDatabase()
    await initDatabase(':memory:')
  })

  afterEach(() => {
    closeDatabase()
    vi.restoreAllMocks()
  })

  describe('Criptografia AES-256-GCM e Integridade AEAD AuthTag', () => {
    it('deve cifrar o buffer SQLite com cabeçalho mágico INFOCENC e rejeitar adulteração de bytes via AuthTag', () => {
      // 1. Arrange
      const plainDbHeader = Buffer.from('SQLite format 3\0\x04\x00\x01\x01\x00@  \x00\x00\x00\x01', 'binary')
      const masterKey = resolveDatabaseMasterKey(':memory:')

      // 2. Act
      const encryptedBuffer = encryptDatabaseBuffer(plainDbHeader, masterKey)

      // 3. Assert
      expect(isEncryptedDatabaseBuffer(encryptedBuffer)).toBe(true)
      expect(encryptedBuffer.toString('ascii', 0, 15)).not.toContain('SQLite format 3')

      // Descriptografia válida
      const decrypted = decryptDatabaseBuffer(encryptedBuffer, masterKey)
      expect(decrypted.toString('ascii', 0, 15)).toContain('SQLite format 3')

      // Adulteração proposital de 1 byte no ciphertext deve falhar via AuthTag AEAD
      const tampered = Buffer.from(encryptedBuffer)
      tampered[tampered.length - 1] ^= 0xff
      expect(() => decryptDatabaseBuffer(tampered, masterKey)).toThrow()
    })
  })

  describe('Módulo de Anonimização Contextual', () => {
    it('deve identificar PII e mascarar CPF, e-mail, telefone e nomes no contexto SCRAPED_TEXT', () => {
      // 1. Arrange
      const rawScraped =
        'Portaria designa: João Carlos da Silva, CPF 123.456.789-00, contato joao.silva@email.com, tel (31) 99888-7766, inscrição nº 998877.'

      // 2. Act
      const detection = detectPersonalData(rawScraped)
      const scrubbed = anonymizeText(rawScraped, 'SCRAPED_TEXT')

      // 3. Assert
      expect(detection.hasPii).toBe(true)
      expect(detection.detectedTypes).toContain('CPF')
      expect(detection.detectedTypes).toContain('EMAIL')
      expect(detection.detectedTypes).toContain('TELEFONE')
      expect(detection.detectedTypes).toContain('NOME_PESSOA_FISICA')

      expect(scrubbed).not.toContain('123.456.789-00')
      expect(scrubbed).not.toContain('joao.silva@email.com')
      expect(scrubbed).not.toContain('99888-7766')
      expect(scrubbed).not.toContain('João Carlos da Silva')
      expect(scrubbed).toContain('[CPF PROTEGIDO - LGPD]')
      expect(scrubbed).toContain('[NOME PROTEGIDO - LGPD]')
    })

    it('deve mascarar credenciais e endereços IP em logs de erro no contexto LOG_OUTPUT', () => {
      // 1. Arrange
      const rawLog =
        'Erro em C:\\Users\\Desenvolvedor\\AppData\\infoconcursos.db via http://admin:senha123@192.168.1.50:8080'

      // 2. Act
      const scrubbed = anonymizeText(rawLog, 'LOG_OUTPUT')

      // 3. Assert
      expect(scrubbed).not.toContain('Desenvolvedor')
      expect(scrubbed).not.toContain('senha123')
      expect(scrubbed).not.toContain('192.168.1.50')
      expect(scrubbed).toContain('[CREDENCIAIS_OCULTAS]')
      expect(scrubbed).toContain('[IP_MASCARADO]')
    })
  })

  describe('Validação e Sanitização de Filtros (Entrada do Usuário)', () => {
    it('deve bloquear buscas com CPF ou e-mail e aplicar valores padrão sanitizados', () => {
      // 1. Arrange
      const tentativaPii = {
        termoLivre: '123.456.789-00',
        area: 'AREA_INEXISTENTE' as any,
        uf: 'XX',
        statusFiltro: 'INVALIDO' as any
      }

      // 2. Act
      const resultado = validateAndSanitizeSearchFilter(tentativaPii)

      // 3. Assert
      expect(resultado.blockedPersonalData).toBe(true)
      expect(resultado.sanitizedFilter.termoLivre).toBe('')
      expect(resultado.sanitizedFilter.area).toBe('TODOS')
      expect(resultado.sanitizedFilter.uf).toBe('TODOS')
      expect(resultado.sanitizedFilter.statusFiltro).toBe('TODOS')
      expect(resultado.validationMessage).toContain('LGPD')
    })
  })

  describe('Integridade de Dados no SQLite Hermético (Zero PII Armazenado)', () => {
    it('não deve retornar dossiês quando a busca for exclusivamente um CPF', async () => {
      // 1. Arrange & Act
      const dossiers = await generateConcursoDossiers(
        { termoLivre: '123.456.789-00' },
        { skipNetwork: true }
      )

      // 3. Assert
      expect(dossiers).toEqual([])
    })

    it('deve expurgar dados pessoais antes de persistir o dossiê no cache local', () => {
      // 1. Arrange
      const dossierComPii: ConcursoDossier = {
        id: 'test-pii-scrub-01',
        termoOriginal: 'TRT MG 123.456.789-00',
        orgao: 'TRT 3ª Região',
        tituloConcurso: 'Concurso TRT MG — Candidato aprovado: Maria Fernanda Oliveira',
        area: 'TRIBUNAIS',
        uf: 'MG',
        status: 'EDITAL_PUBLICADO',
        statusLabel: 'Edital Publicado',
        resumoGeral: 'Dúvidas pelo e-mail candidato.privado@gmail.com ou CPF 111.222.333-44.',
        banca: {
          nome: 'FCC',
          situacao: 'CONTRATADA',
          observacao: 'Servidor designado: Carlos Alberto Souza (CPF 999.888.777-66).'
        },
        cronograma: {
          previsaoEdital: 'Publicado',
          ultimaMovimentacao: 'Portaria publicada.'
        },
        cargosPrevistos: [],
        materiasRecomendadas: ['Direito Constitucional'],
        linksReferencia: [],
        atualizadoEm: new Date().toISOString()
      }

      // 2. Act
      saveSearchResultsToCache({ termoLivre: 'TRT MG', area: 'TRIBUNAIS', uf: 'MG' }, [dossierComPii])
      const cached = getCachedSearchResults({ termoLivre: 'TRT MG', area: 'TRIBUNAIS', uf: 'MG' })

      // 3. Assert
      expect(cached).not.toBeNull()
      const salvo = cached!.data[0]
      const serializado = JSON.stringify(salvo)

      expect(serializado).not.toContain('123.456.789-00')
      expect(serializado).not.toContain('111.222.333-44')
      expect(serializado).not.toContain('999.888.777-66')
      expect(serializado).not.toContain('candidato.privado@gmail.com')
      expect(serializado).not.toContain('Maria Fernanda Oliveira')
      expect(serializado).not.toContain('Carlos Alberto Souza')
    })

    it('deve eliminar todo histórico e cache ao acionar o direito de eliminação (Art. 18, VI LGPD)', () => {
      // 1. Arrange: popula tabelas de histórico, cache de busca e notícias
      const db = getDb()
      db.insert(historicoBuscasTable)
        .values({
          id: 'hist-test-1',
          termo: 'Banco do Brasil',
          area: 'BANCARIA',
          uf: 'BR',
          executadoEm: new Date().toISOString()
        })
        .run()

      saveSearchResultsToCache({ termoLivre: 'BB', area: 'BANCARIA', uf: 'BR' }, [
        {
          id: 'bb-dossier-test',
          termoOriginal: 'BB',
          orgao: 'Banco do Brasil',
          tituloConcurso: 'Concurso BB',
          area: 'BANCARIA',
          uf: 'BR',
          status: 'PREVISTO',
          statusLabel: 'Previsto',
          resumoGeral: 'Resumo',
          tipoRegistro: 'NOTICIA_APURACAO',
          banca: { nome: 'Cesgranrio', situacao: 'COTADA_OU_HISTORICO', observacao: '' },
          cronograma: { previsaoEdital: '2026', ultimaMovimentacao: '' },
          cargosPrevistos: [],
          materiasRecomendadas: [],
          linksReferencia: [],
          atualizadoEm: new Date().toISOString()
        }
      ])

      saveNewsToCache([
        {
          id: 'news-test-1',
          titulo: 'Concurso Banco do Brasil 2026 previsto',
          resumo: 'Novo certame em pauta.',
          url: 'https://exemplo.com/bb',
          portalFonte: 'PCI Concursos',
          dataPublicacao: new Date().toISOString(),
          area: 'BANCARIA',
          uf: 'BR',
          statusRelacionado: 'PREVISTO',
          orgaoRelacionado: 'Banco do Brasil'
        }
      ])

      expect(db.select().from(historicoBuscasTable).all().length).toBeGreaterThan(0)
      expect(db.select().from(buscaCacheTable).all().length).toBeGreaterThan(0)
      expect(db.select().from(noticiasTable).all().length).toBeGreaterThan(0)

      // 2. Act
      const resultadoPurge = purgeLocalCacheAndHistory()

      // 3. Assert
      expect(resultadoPurge.clearedHistory).toBe(true)
      expect(resultadoPurge.clearedCache).toBe(true)
      expect(db.select().from(historicoBuscasTable).all()).toHaveLength(0)
      expect(db.select().from(buscaCacheTable).all()).toHaveLength(0)
      expect(db.select().from(noticiasTable).all()).toHaveLength(0)
      expect(db.select().from(concursosTable).all()).toHaveLength(0)
    })
  })

  describe('Segurança de Rede e Configuração de Privacidade (Proxy / Headers)', () => {
    it('deve gerar cabeçalhos de preservação de privacidade DNT e Sec-GPC', () => {
      // Arrange & Act
      const headers = buildPrivacyPreservingHeaders()

      // Assert
      expect(headers['DNT']).toBe('1')
      expect(headers['Sec-GPC']).toBe('1')
      expect(headers['Cache-Control']).toContain('no-store')
    })

    it('deve validar e mascarar URL de proxy ao configurar privacidade de rede', () => {
      // 1. Rejeição de protocolo inválido
      const invalidProxy = configureNetworkPrivacy({
        proxyUrl: 'ftp://invalid-proxy:21',
        proxyEnabled: true
      })
      expect(invalidProxy.success).toBe(false)

      // 2. Aceite de proxy válido e mascaramento de credenciais
      const validProxy = configureNetworkPrivacy({
        proxyUrl: 'http://usuario:segredo@127.0.0.1:8080',
        proxyEnabled: true
      })
      expect(validProxy.success).toBe(true)
      expect(validProxy.status.activeDispatcherType).toBe('ELECTRON_NATIVE_PROXY')
      expect(validProxy.status.maskedProxyUrl).toContain('[CREDENCIAIS_OCULTAS]')
      expect(validProxy.status.maskedProxyUrl).not.toContain('segredo')

      // Restauração do modo direto
      configureNetworkPrivacy({ proxyUrl: '', proxyEnabled: false })
      expect(getNetworkPrivacyStatus().activeDispatcherType).toBe('DIRECT_PRIVACY_HARDENED')
    })

    it('deve omitir credenciais e configurar no-referrer em requisições seguras com proxy configurado', async () => {
      // Arrange: habilita proxy temporariamente
      configureNetworkPrivacy({
        proxyUrl: 'http://127.0.0.1:8080',
        proxyEnabled: true
      })

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('<html><body>OK</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        })
      )

      // Act
      await fetchHtmlWithSafety('https://example.com/edital')

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const callInit = fetchSpy.mock.calls[0][1] as RequestInit
      expect(callInit.credentials).toBe('omit')
      expect(callInit.referrerPolicy).toBe('no-referrer')

      // Teardown
      configureNetworkPrivacy({ proxyUrl: '', proxyEnabled: false })
    })
  })
})
