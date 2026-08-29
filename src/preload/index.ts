import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getLibrary: () => ipcRenderer.invoke('get-library'),
  getQueue: () => ipcRenderer.invoke('get-queue'),
  getMusicDir: () => ipcRenderer.invoke('get-music-dir'),
  getVolume: () => ipcRenderer.invoke('get-volume'),
  setVolume: (v: number) => ipcRenderer.invoke('set-volume', v),
  scanLibrary: () => ipcRenderer.invoke('scan-library'),
  chooseMusicDir: () => ipcRenderer.invoke('choose-music-dir'),
  downloadAudio: (url: string, quality?: string) => ipcRenderer.invoke('download-audio', url, quality),
  getFormats: (url: string) => ipcRenderer.invoke('get-formats', url),
  downloadVideo: (url: string, formatId: string) => ipcRenderer.invoke('download-video', url, formatId),
  setNowPlaying: (track: any) => ipcRenderer.invoke('set-now-playing', track),
  removeFromLibrary: (id: string) => ipcRenderer.invoke('remove-from-library', id),

  on: (channel: string, fn: (...args: any[]) => void) => {
    const listener = (_event: any, ...args: any[]) => fn(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
})
