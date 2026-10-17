import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { drizzle, SQLJsDatabase } from 'drizzle-orm/sql-js'
import * as schema from './schema'
import {
  resolveDatabaseMasterKey,
  encryptDatabaseBuffer,
  decryptDatabaseBuffer,
  getDatabaseEncryptionStatus
} from './crypto-storage'

let sqliteInstance: SqlJsDatabase | null = null
let dbInstance: SQLJsDatabase<typeof schema> | null = null
let activeDbPath: string = ''
let isInMemoryMode: boolean = false

export function getDefaultDbPath(customDir?: string): string {
  const baseDir =
    customDir ||
    process.env.APPDATA ||
    path.join(os.homedir(), '.config')
  const appDir = path.join(baseDir, 'infoconcursos')
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true })
  }
  return path.join(appDir, 'infoconcursos.db')
}

export async function initDatabase(
  customDbPath?: string,
  options?: { inMemory?: boolean }
): Promise<SQLJsDatabase<typeof schema>> {
  if (dbInstance && sqliteInstance) {
    return dbInstance
  }

  isInMemoryMode = Boolean(options?.inMemory || customDbPath === ':memory:')
  activeDbPath = isInMemoryMode ? ':memory:' : customDbPath || getDefaultDbPath()

  if (!isInMemoryMode) {
    const dir = path.dirname(activeDbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  const SQL = await initSqlJs()

  if (!isInMemoryMode && fs.existsSync(activeDbPath)) {
    const rawFileBuffer = fs.readFileSync(activeDbPath)
    if (rawFileBuffer.length > 0) {
      const masterKey = resolveDatabaseMasterKey(activeDbPath)
      const decryptedBuffer = decryptDatabaseBuffer(rawFileBuffer, masterKey)
      sqliteInstance = new SQL.Database(decryptedBuffer)
    } else {
      sqliteInstance = new SQL.Database()
    }
  } else {
    sqliteInstance = new SQL.Database()
  }

  sqliteInstance.run(`
    CREATE TABLE IF NOT EXISTS concursos (
      id TEXT PRIMARY KEY,
      termo_original TEXT NOT NULL,
      orgao TEXT NOT NULL,
      sigla_orgao TEXT,
      titulo_concurso TEXT NOT NULL,
      area TEXT NOT NULL,
      uf TEXT NOT NULL,
      status TEXT NOT NULL,
      status_label TEXT NOT NULL,
      resumo_geral TEXT NOT NULL,
      dossier_json TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monitoramentos (
      id TEXT PRIMARY KEY,
      concurso_id TEXT NOT NULL,
      orgao TEXT NOT NULL,
      titulo_concurso TEXT NOT NULL,
      termo_monitorado TEXT NOT NULL,
      status_atual TEXT NOT NULL,
      status_label TEXT NOT NULL,
      ultima_verificacao TEXT NOT NULL,
      possui_novidade INTEGER NOT NULL DEFAULT 0,
      descricao_novidade TEXT,
      dossier_snapshot_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS noticias (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      resumo TEXT NOT NULL,
      url TEXT NOT NULL,
      portal_fonte TEXT NOT NULL,
      data_publicacao TEXT NOT NULL,
      area TEXT NOT NULL,
      uf TEXT NOT NULL,
      status_relacionado TEXT NOT NULL,
      orgao_relacionado TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS historico_buscas (
      id TEXT PRIMARY KEY,
      termo TEXT NOT NULL,
      area TEXT NOT NULL,
      uf TEXT NOT NULL,
      executado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS busca_cache (
      cache_key TEXT PRIMARY KEY,
      termo TEXT,
      area TEXT NOT NULL,
      uf TEXT,
      status_filtro TEXT NOT NULL,
      concurso_ids_json TEXT NOT NULL,
      total_resultados INTEGER NOT NULL,
      atualizado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      chave TEXT PRIMARY KEY,
      atualizado_em TEXT NOT NULL,
      detalhes_json TEXT
    );

    -- Índices B-Tree para buscas O(log N) e poda eficiente de TTL
    CREATE INDEX IF NOT EXISTS idx_concursos_area_status ON concursos(area, status);
    CREATE INDEX IF NOT EXISTS idx_concursos_uf ON concursos(uf);
    CREATE INDEX IF NOT EXISTS idx_concursos_atualizado_em ON concursos(atualizado_em);
    CREATE INDEX IF NOT EXISTS idx_monitoramentos_concurso_id ON monitoramentos(concurso_id);
    CREATE INDEX IF NOT EXISTS idx_noticias_data ON noticias(data_publicacao DESC);
    CREATE INDEX IF NOT EXISTS idx_busca_cache_atualizado ON busca_cache(atualizado_em);
    CREATE INDEX IF NOT EXISTS idx_historico_executado ON historico_buscas(executado_em DESC);
  `)

  pruneExpiredCacheOnStartup(sqliteInstance)
  if (!isInMemoryMode) {
    persistDatabaseToDisk()
  }
  dbInstance = drizzle(sqliteInstance, { schema })
  // Warm-up completo do query builder e driver sql.js em memória
  dbInstance
    .insert(schema.historicoBuscasTable)
    .values({ id: '__warmup__', termo: '', area: '', uf: '', executadoEm: '' })
    .run()
  dbInstance.select().from(schema.concursosTable).limit(1).all()
  sqliteInstance.run(`DELETE FROM historico_buscas WHERE id = '__warmup__'`)
  return dbInstance
}

/**
 * Executa poda automática de cache efêmero expirado (TTL) e aplica política Ring-Buffer (LRU/FIFO),
 * preservando incondicionalmente os certames monitorados pelo usuário (arquitetura Local-First)
 * e acionando VACUUM apenas quando o PRAGMA freelist_count indicar páginas livres acumuladas.
 */
export function pruneExpiredCacheOnStartup(
  db: SqlJsDatabase | null = sqliteInstance,
  retentionDays = 14
): void {
  if (!db) return
  try {
    const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

    // 1. Expira chaves de busca antigas (TTL)
    db.run(`DELETE FROM busca_cache WHERE atualizado_em < ?`, [cutoffIso])

    // 2. Remove dossiês antigos NÃO monitorados pelo usuário (preserva fonte da verdade Local-First)
    db.run(
      `DELETE FROM concursos 
       WHERE atualizado_em < ? 
         AND id NOT IN (SELECT concurso_id FROM monitoramentos)`,
      [cutoffIso]
    )

    // 3. Mantém teto máximo (Ring-Buffer) de 200 itens no histórico de buscas
    db.run(`
      DELETE FROM historico_buscas 
      WHERE id NOT IN (
        SELECT id FROM historico_buscas ORDER BY executado_em DESC LIMIT 200
      )
    `)

    // 4. Mantém teto máximo de 300 matérias recentes no cache de notícias
    db.run(`
      DELETE FROM noticias 
      WHERE id NOT IN (
        SELECT id FROM noticias ORDER BY data_publicacao DESC LIMIT 300
      )
    `)

    // 5. Compactação condicional da memória WASM: só executa VACUUM se houver páginas acumuladas na freelist
    const freelistRes = db.exec(`PRAGMA freelist_count;`)
    const freelistPages = Number(freelistRes?.[0]?.values?.[0]?.[0] ?? 0)
    if (freelistPages > 16) {
      db.run(`VACUUM;`)
    }
  } catch (err) {
    console.warn('[Database] Aviso ao podar cache expirado na inicialização:', err)
  }
}

export function persistDatabaseToDisk(): void {
  if (!sqliteInstance || !activeDbPath || isInMemoryMode || activeDbPath === ':memory:') return
  const tempPath = `${activeDbPath}.tmp`
  let fd: number | null = null
  try {
    const data = sqliteInstance.export()
    const plainBuffer = Buffer.from(data)
    const masterKey = resolveDatabaseMasterKey(activeDbPath)
    const encryptedBuffer = encryptDatabaseBuffer(plainBuffer, masterKey)
    // 1. Abre descritor no arquivo temporário, grava o buffer e força flush físico (fsync) antes do rename (Pillai et al., OSDI 2014)
    fd = fs.openSync(tempPath, 'w')
    fs.writeFileSync(fd, encryptedBuffer)
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    fd = null
    // 2. Substituição atômica de namespace após garantia de durabilidade física no armazenamento não-volátil
    fs.renameSync(tempPath, activeDbPath)
  } catch (err) {
    console.error('[Database] Falha ao persistir SQLite atomicamente:', err)
    if (fd !== null) {
      try {
        fs.closeSync(fd)
      } catch {
        // Ignora erro de fechamento em caso de falha prévia
      }
    }
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath)
      } catch {
        // Ignora erro secundário de limpeza do arquivo temporário
      }
    }
  }
}

export function purgeLocalCacheAndHistory(): {
  clearedHistory: boolean
  clearedCache: boolean
  clearedAt: string
} {
  if (!sqliteInstance) {
    return {
      clearedHistory: false,
      clearedCache: false,
      clearedAt: new Date().toISOString()
    }
  }

  sqliteInstance.run(`
    DELETE FROM historico_buscas;
    DELETE FROM busca_cache;
    DELETE FROM noticias;
    DELETE FROM sync_metadata;
    DELETE FROM concursos WHERE id NOT IN (SELECT concurso_id FROM monitoramentos);
    VACUUM;
  `)

  if (!isInMemoryMode && activeDbPath !== ':memory:') {
    persistDatabaseToDisk()
  }

  return {
    clearedHistory: true,
    clearedCache: true,
    clearedAt: new Date().toISOString()
  }
}

export function getActiveDatabaseSecurityInfo(): {
  encryptedAtRest: boolean
  algorithm: 'AES-256-GCM'
  keyManagement: 'OS_KEYCHAIN_DPAPI' | 'LOCAL_SCRYPT_KDF'
} {
  return getDatabaseEncryptionStatus(activeDbPath)
}

export function getDb(): SQLJsDatabase<typeof schema> {
  if (!dbInstance) {
    throw new Error('Banco de dados SQLite ainda não foi inicializado. Chame initDatabase() primeiro.')
  }
  return dbInstance
}

export function getActiveDbPath(): string {
  return activeDbPath
}

export function closeDatabase(): void {
  if (sqliteInstance) {
    if (!isInMemoryMode && activeDbPath !== ':memory:') {
      persistDatabaseToDisk()
    }
    sqliteInstance.close()
    sqliteInstance = null
    dbInstance = null
    isInMemoryMode = false
    activeDbPath = ''
  }
}
