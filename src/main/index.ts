import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './database'
import { registerAllIpcHandlers } from './ipc/handlers'
import { applyElectronSessionProxy } from './modules/privacy/network-privacy'

let mainWindow: BrowserWindow | null = null

// 1. Single Instance Lock: Prevenção estrita de processos duplicados concorrentes no SO
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  // Encerra imediatamente a segunda instância sem abrir janelas ou tocar no SQLite
  app.exit(0)
} else {
  app.on('second-instance', () => {
    // Foca na janela existente se o usuário tentar abrir o app novamente
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// 2. Manipuladores Globais de Falha no Processo (GAP 05 do dev-agent.md)
process.on('uncaughtException', (err) => {
  console.error('[Main] Exceção crítica não tratada:', err)
  try {
    closeDatabase()
  } catch {}
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.warn('[Main] Rejeição de Promise não capturada:', reason)
})

function isTrustedLocalNavigationUrl(navigationUrl: string): boolean {
  try {
    const parsed = new URL(navigationUrl)
    if (
      is.dev &&
      process.env['ELECTRON_RENDERER_URL'] &&
      parsed.origin === new URL(process.env['ELECTRON_RENDERER_URL']).origin
    ) {
      return true
    }
    if (parsed.protocol === 'file:') {
      return true
    }
  } catch {
    return false
  }
  return false
}

function enforceExternalOrBlockNavigation(event: Electron.Event, navigationUrl: string): void {
  if (isTrustedLocalNavigationUrl(navigationUrl)) {
    return
  }
  event.preventDefault()
  try {
    const parsed = new URL(navigationUrl)
    if (parsed.protocol === 'https:') {
      shell.openExternal(navigationUrl)
    }
  } catch {
    // Ignora URL inválida
  }
}

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'InfoConcursos • Editorial, Busca & Dossiês de Estudo',
    backgroundColor: '#121112',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'https:') {
        shell.openExternal(details.url)
      }
    } catch {
      // Ignora URL inválida
    }
    return { action: 'deny' }
  })

  // Bloqueio rigoroso de navegações e redirecionamentos in-window (Electron Security Checklist #13 / Doyensec)
  mainWindow.webContents.on('will-navigate', enforceExternalOrBlockNavigation)
  mainWindow.webContents.on('will-redirect', enforceExternalOrBlockNavigation)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// Proteção global em nível de processo contra anexação de <webview> ou navegações não autorizadas (Checklist #12 & #13)
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (waEvent) => {
    waEvent.preventDefault()
  })
  contents.on('will-navigate', enforceExternalOrBlockNavigation)
  contents.on('will-redirect', enforceExternalOrBlockNavigation)
})

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.infoconcursos.desktop')

  // Nega categoricamente checagens síncronas e pedidos assíncronos de permissões nativas (Electron Security Checklist #5)
  session.defaultSession.setPermissionCheckHandler(() => false)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await initDatabase(join(app.getPath('userData'), 'infoconcursos.db'))
  registerAllIpcHandlers()
  await applyElectronSessionProxy()

  ipcMain.handle('system:openExternalUrl', async (_event, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:') {
        await shell.openExternal(url)
        return true
      }
    } catch {
      return false
    }
    return false
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 3. Garantia de Persistência e Encerramento Atômico de Processos (Prevenção de Dangling Processes)
app.on('before-quit', () => {
  try {
    closeDatabase()
  } catch (err) {
    console.error('[Main] Erro ao persistir banco no before-quit:', err)
  }
})

app.on('window-all-closed', () => {
  try {
    closeDatabase()
  } catch (err) {
    console.error('[Main] Erro ao persistir banco no window-all-closed:', err)
  }
  if (process.platform !== 'darwin') {
    // app.exit(0) encerra imediatamente o processo e cancela qualquer socket de rede pendente
    app.exit(0)
  }
})
