import { useEffect } from 'react'
import { useStore } from './store'
import { Player } from './components/Player'
import { Library } from './components/Library'
import { Downloader } from './components/Downloader'
import './styles/globals.css'

declare global {
  interface Window {
    api: {
      getLibrary(): Promise<any[]>
      getQueue(): Promise<any[]>
      getMusicDir(): Promise<string>
      getVolume(): Promise<number>
      setVolume(v: number): Promise<void>
      scanLibrary(): Promise<any[]>
      chooseMusicDir(): Promise<string | null>
      downloadAudio(url: string, quality?: string): Promise<string>
      getFormats(url: string): Promise<any[]>
      downloadVideo(url: string, formatId: string): Promise<void>
      setNowPlaying(track: any): Promise<void>
      removeFromLibrary(id: string): Promise<any[]>
      on(channel: string, fn: (...args: any[]) => void): () => void
    }
  }
}

export default function App() {
  const {
    view, searchQuery, queue,
    setLibrary, setQueue, setVolume, setView, setSearchQuery, updateDownload
  } = useStore()

  useEffect(() => {
    const init = async () => {
      const [lib, q, vol] = await Promise.all([
        window.api.getLibrary(),
        window.api.getQueue(),
        window.api.getVolume()
      ])
      setLibrary(lib)
      setQueue(q)
      setVolume(vol)

      const scanned = await window.api.scanLibrary()
      setLibrary(scanned)
    }
    init()

    const offQueue = window.api.on('queue-update', (q) => setQueue(q))
    const offProgress = window.api.on('download-progress', ({ id, progress, speed, eta }) => {
      updateDownload(id, { progress, speed, eta })
    })
    const offLib = window.api.on('library-update', (lib) => setLibrary(lib))

    return () => { offQueue(); offProgress(); offLib() }
  }, [])

  const activeDownloads = queue.filter(d => d.status === 'downloading' || d.status === 'queued').length

  return (
    <div className="app">
      <div className="main-area">
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">🎵</div>
            <span>BurmaldaMusic</span>
          </div>

          {[
            { id: 'library', label: 'Библиотека', icon: '🎵' },
            { id: 'downloads', label: 'Загрузки', icon: '⬇', badge: activeDownloads },
            { id: 'youtube', label: 'YouTube', icon: '▶' }
          ].map(item => (
            <div
              key={item.id}
              className={`nav-item${view === item.id ? ' active' : ''}`}
              onClick={() => setView(item.id as any)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="badge">{item.badge}</span> : null}
            </div>
          ))}

          <div style={{ flex: 1 }} />

          <div
            className="nav-item"
            onClick={async () => {
              const dir = await window.api.chooseMusicDir()
              if (dir) {
                const lib = await window.api.scanLibrary()
                setLibrary(lib)
              }
            }}
          >
            <span className="nav-icon">📁</span>
            <span>Папка музыки</span>
          </div>
        </div>

        <div className="content">
          {view === 'library' && (
            <>
              <div className="search-bar">
                <span style={{ color: 'var(--text3)' }}>🔍</span>
                <input
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Library />
            </>
          )}

          {(view === 'downloads' || view === 'youtube') && <Downloader />}
        </div>
      </div>

      <Player />
    </div>
  )
}
