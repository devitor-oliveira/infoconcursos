import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { drizzle, SQLJsDatabase } from 'drizzle-orm/sql-js'
import * as schema from './schema'

let sqliteInstance: SqlJsDatabase | null = null
let dbInstance: SQLJsDatabase<typeof schema> | null = null
let activeDbPath: string = ''

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

export async function initDatabase(customDbPath?: string): Promise<SQLJsDatabase<typeof schema>> {
  if (dbInstance && sqliteInstance) {
    return dbInstance
  }

  activeDbPath = customDbPath || getDefaultDbPath()
  const dir = path.dirname(activeDbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const SQL = await initSqlJs()

  if (fs.existsSync(activeDbPath)) {
    const fileBuffer = fs.readFileSync(activeDbPath)
    sqliteInstance = new SQL.Database(fileBuffer)
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
  `)

  persistDatabaseToDisk()
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

export function persistDatabaseToDisk(): void {
  if (!sqliteInstance || !activeDbPath) return
  const data = sqliteInstance.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(activeDbPath, buffer)
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
    persistDatabaseToDisk()
    sqliteInstance.close()
    sqliteInstance = null
    dbInstance = null
  }
}
