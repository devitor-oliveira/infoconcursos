import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const MAGIC_HEADER = Buffer.from('INFOCENC', 'ascii') // 8 bytes
const SQLITE_PLAIN_HEADER = Buffer.from('SQLite format 3\0', 'ascii') // 16 bytes
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // Recomendação NIST SP 800-38D para AES-GCM (96 bits)
const AUTH_TAG_LENGTH = 16 // 128 bits de tag de autenticação AEAD
const KDF_SALT = Buffer.from('InfoConcursos-LGPD-AtRest-Salt-v1', 'utf-8')

let cachedMasterKey: Buffer | null = null

/**
 * Tenta obter o módulo safeStorage do Electron dinamicamente (DPAPI no Windows, Keychain no macOS, libsecret no Linux).
 * Retorna null quando executado em ambiente de testes Node/Vitest fora do binário Electron.
 */
function getElectronSafeStorage(): {
  isEncryptionAvailable: () => boolean
  encryptString: (plainText: string) => Buffer
  decryptString: (encrypted: Buffer) => string
} | null {
  try {
    // Verifica se estamos dentro de um processo Electron real
    if (!process.versions || !process.versions.electron) {
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron')
    if (electron && electron.safeStorage && typeof electron.safeStorage.isEncryptionAvailable === 'function') {
      return electron.safeStorage
    }
  } catch {
    // Ambiente de teste Node.js puro (Vitest)
  }
  return null
}

/**
 * Obtém ou gera a chave mestra de 256 bits (32 bytes) para criptografia do banco SQLite.
 * Prioriza o cofre nativo do Sistema Operacional (Electron safeStorage / DPAPI) e possui
 * fallback determinístico via KDF memory-hard (scrypt RFC 7914) vinculado ao host local.
 */
export function resolveDatabaseMasterKey(dbFilePath: string): Buffer {
  if (cachedMasterKey) {
    return cachedMasterKey
  }

  const safeStorage = getElectronSafeStorage()
  const keyFilePath = `${dbFilePath}.key`

  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      if (fs.existsSync(keyFilePath)) {
        const encryptedKeyBuf = fs.readFileSync(keyFilePath)
        const hexKey = safeStorage.decryptString(encryptedKeyBuf)
        const keyBuf = Buffer.from(hexKey, 'hex')
        if (keyBuf.length === 32) {
          cachedMasterKey = keyBuf
          return cachedMasterKey
        }
      }

      const freshKey = crypto.randomBytes(32)
      const encryptedKeyBuf = safeStorage.encryptString(freshKey.toString('hex'))
      const dir = path.dirname(keyFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(keyFilePath, encryptedKeyBuf)
      cachedMasterKey = freshKey
      return cachedMasterKey
    } catch {
      // Fallback para KDF local caso o cofre do SO recuse acesso
    }
  }

  // Derivação criptográfica local (scrypt - RFC 7914) baseada em parâmetros da máquina do usuário
  let userIdentifier = 'default-local-user'
  try {
    userIdentifier = os.userInfo().username
  } catch {
    // ignora caso container/sandbox restrinja os.userInfo
  }

  const machineMaterial = `infoconcursos:${os.platform()}:${os.arch()}:${os.hostname()}:${userIdentifier}`
  cachedMasterKey = crypto.scryptSync(machineMaterial, KDF_SALT, 32)
  return cachedMasterKey
}

/**
 * Verifica se um buffer carregado do disco está criptografado com o cabeçalho AEAD do InfoConcursos.
 */
export function isEncryptedDatabaseBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < MAGIC_HEADER.length + IV_LENGTH + AUTH_TAG_LENGTH) {
    return false
  }
  return buffer.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER)
}

/**
 * Criptografa o buffer binário do SQLite utilizando AES-256-GCM (NIST SP 800-38D).
 * Layout binário: [MAGIC_HEADER (8B)] + [IV (12B)] + [AUTH_TAG (16B)] + [CIPHERTEXT (...)]
 */
export function encryptDatabaseBuffer(plainSqliteBuffer: Buffer, masterKey: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  const ciphertext = Buffer.concat([cipher.update(plainSqliteBuffer), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([MAGIC_HEADER, iv, authTag, ciphertext])
}

/**
 * Descriptografa o buffer binário do banco SQLite e valida a AuthTag de integridade GCM.
 * Suporta migração transparente de arquivos SQLite legados em texto plano.
 */
export function decryptDatabaseBuffer(fileBuffer: Buffer, masterKey: Buffer): Buffer {
  if (!fileBuffer || fileBuffer.length === 0) {
    return Buffer.alloc(0)
  }

  // Migração transparente: se o arquivo existente em disco ainda for SQLite não criptografado
  if (
    fileBuffer.length >= SQLITE_PLAIN_HEADER.length &&
    fileBuffer.subarray(0, SQLITE_PLAIN_HEADER.length).equals(SQLITE_PLAIN_HEADER)
  ) {
    return fileBuffer
  }

  if (!isEncryptedDatabaseBuffer(fileBuffer)) {
    throw new Error('Formato de arquivo de banco de dados inválido ou corrompido.')
  }

  const ivStart = MAGIC_HEADER.length
  const tagStart = ivStart + IV_LENGTH
  const dataStart = tagStart + AUTH_TAG_LENGTH

  const iv = fileBuffer.subarray(ivStart, tagStart)
  const authTag = fileBuffer.subarray(tagStart, dataStart)
  const ciphertext = fileBuffer.subarray(dataStart)

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/**
 * Retorna metadados técnicos sobre o estado de criptografia do banco local para auditoria LGPD.
 */
export function getDatabaseEncryptionStatus(dbFilePath: string): {
  encryptedAtRest: boolean
  algorithm: 'AES-256-GCM'
  keyManagement: 'OS_KEYCHAIN_DPAPI' | 'LOCAL_SCRYPT_KDF'
} {
  const safeStorage = getElectronSafeStorage()
  const usesOsKeychain = Boolean(safeStorage && safeStorage.isEncryptionAvailable())
  let encryptedOnDisk = true

  if (dbFilePath && fs.existsSync(dbFilePath)) {
    try {
      const fd = fs.openSync(dbFilePath, 'r')
      const headerBuf = Buffer.alloc(MAGIC_HEADER.length)
      fs.readSync(fd, headerBuf, 0, MAGIC_HEADER.length, 0)
      fs.closeSync(fd)
      encryptedOnDisk = headerBuf.equals(MAGIC_HEADER)
    } catch {
      encryptedOnDisk = true
    }
  }

  return {
    encryptedAtRest: encryptedOnDisk,
    algorithm: 'AES-256-GCM',
    keyManagement: usesOsKeychain ? 'OS_KEYCHAIN_DPAPI' : 'LOCAL_SCRYPT_KDF'
  }
}
