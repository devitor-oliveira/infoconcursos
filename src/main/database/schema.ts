import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const concursosTable = sqliteTable('concursos', {
  id: text('id').primaryKey(),
  termoOriginal: text('termo_original').notNull(),
  orgao: text('orgao').notNull(),
  siglaOrgao: text('sigla_orgao'),
  tituloConcurso: text('titulo_concurso').notNull(),
  area: text('area').notNull(),
  uf: text('uf').notNull(),
  status: text('status').notNull(),
  statusLabel: text('status_label').notNull(),
  resumoGeral: text('resumo_geral').notNull(),
  dossierJson: text('dossier_json').notNull(),
  atualizadoEm: text('atualizado_em').notNull()
})

export const monitoramentosTable = sqliteTable('monitoramentos', {
  id: text('id').primaryKey(),
  concursoId: text('concurso_id').notNull(),
  orgao: text('orgao').notNull(),
  tituloConcurso: text('titulo_concurso').notNull(),
  termoMonitorado: text('termo_monitorado').notNull(),
  statusAtual: text('status_atual').notNull(),
  statusLabel: text('status_label').notNull(),
  ultimaVerificacao: text('ultima_verificacao').notNull(),
  possuiNovidade: integer('possui_novidade', { mode: 'boolean' }).notNull().default(false),
  descricaoNovidade: text('descricao_novidade'),
  dossierSnapshotJson: text('dossier_snapshot_json').notNull()
})

export const noticiasTable = sqliteTable('noticias', {
  id: text('id').primaryKey(),
  titulo: text('titulo').notNull(),
  resumo: text('resumo').notNull(),
  url: text('url').notNull(),
  portalFonte: text('portal_fonte').notNull(),
  dataPublicacao: text('data_publicacao').notNull(),
  area: text('area').notNull(),
  uf: text('uf').notNull(),
  statusRelacionado: text('status_relacionado').notNull(),
  orgaoRelacionado: text('orgao_relacionado').notNull()
})

export const historicoBuscasTable = sqliteTable('historico_buscas', {
  id: text('id').primaryKey(),
  termo: text('termo').notNull(),
  area: text('area').notNull(),
  uf: text('uf').notNull(),
  executadoEm: text('executado_em').notNull()
})

export const buscaCacheTable = sqliteTable('busca_cache', {
  cacheKey: text('cache_key').primaryKey(),
  termo: text('termo'),
  area: text('area').notNull(),
  uf: text('uf'),
  statusFiltro: text('status_filtro').notNull(),
  concursoIdsJson: text('concurso_ids_json').notNull(),
  totalResultados: integer('total_resultados').notNull(),
  atualizadoEm: text('atualizado_em').notNull()
})

export const syncMetadataTable = sqliteTable('sync_metadata', {
  chave: text('chave').primaryKey(),
  atualizadoEm: text('atualizado_em').notNull(),
  detalhesJson: text('detalhes_json')
})

