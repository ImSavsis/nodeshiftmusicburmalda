import { ipcMain, dialog, app } from 'electron'
import path from 'path'
import { store, type TrackMeta } from './store'
import { addToQueue, getQueue, dlEmitter, getVideoFormats, downloadVideo } from './downloader'
import { setActivity, type NowPlaying } from './discord'
import { mergeLibrary } from './library'

export function setupIPC(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle('get-library', () => store.get('library'))
  ipcMain.handle('get-queue', () => getQueue())
  ipcMain.handle('get-music-dir', () => store.get('musicDir') || path.join(app.getPath('music'), 'BurmaldaMusic'))
  ipcMain.handle('get-volume', () => store.get('volume'))
  ipcMain.handle('set-volume', (_e, vol: number) => store.set('volume', vol))

  ipcMain.handle('scan-library', async () => {
    const dir = store.get('musicDir') as string || path.join(app.getPath('music'), 'BurmaldaMusic')
    return mergeLibrary(dir)
  })

  ipcMain.handle('choose-music-dir', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (!result.canceled && result.filePaths[0]) {
      store.set('musicDir', result.filePaths[0])
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('download-audio', (_e, url: string, quality?: string) => {
    return addToQueue(url, quality || 'bestaudio')
  })

  ipcMain.handle('get-formats', async (_e, url: string) => {
    return getVideoFormats(url)
  })

  ipcMain.handle('download-video', async (_e, url: string, formatId: string) => {
    const dir = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (!dir.canceled && dir.filePaths[0]) {
      await downloadVideo(url, formatId, dir.filePaths[0])
    }
  })

  ipcMain.handle('set-now-playing', (_e, track: NowPlaying | null) => {
    setActivity(track)
  })

  ipcMain.handle('remove-from-library', (_e, id: string) => {
    const lib = store.get('library') as TrackMeta[]
    store.set('library', lib.filter(t => t.id !== id))
    return store.get('library')
  })

  dlEmitter.on('queue-update', (queue) => {
    mainWindow.webContents.send('queue-update', queue)
  })

  dlEmitter.on('download-progress', (data) => {
    mainWindow.webContents.send('download-progress', data)
  })

  dlEmitter.on('library-update', (library) => {
    mainWindow.webContents.send('library-update', library)
  })
}
