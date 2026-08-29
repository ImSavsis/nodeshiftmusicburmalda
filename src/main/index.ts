import { app, BrowserWindow, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { optimizer, is } from '@electron-toolkit/utils'
import { setupIPC } from './ipc'
import { initDiscordRPC, destroyRPC } from './discord'
import { store } from './store'

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true } }
])

let mainWindow: BrowserWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0a',
      symbolColor: '#ffffff',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  optimizer.watchWindowShortcuts(mainWindow)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  setupIPC(mainWindow)
}

app.whenReady().then(() => {
  protocol.handle('media', (request) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''))
    return net.fetch(`file://${filePath}`)
  })

  createWindow()
  initDiscordRPC()

  const savedDir = store.get('musicDir') as string
  if (!savedDir) {
    const defaultDir = require('path').join(app.getPath('music'), 'BurmaldaMusic')
    store.set('musicDir', defaultDir)
  }
})

app.on('window-all-closed', () => {
  destroyRPC()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
