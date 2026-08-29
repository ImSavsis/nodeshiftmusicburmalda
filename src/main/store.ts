import Store from 'electron-store'

interface StoreSchema {
  musicDir: string
  volume: number
  downloads: DownloadRecord[]
  library: TrackMeta[]
}

export interface TrackMeta {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  filePath: string
  coverPath?: string
  coverUrl?: string
  source: 'youtube' | 'spotify' | 'soundcloud' | 'applemusic' | 'local'
  addedAt: number
}

export interface DownloadRecord {
  id: string
  url: string
  title: string
  status: 'queued' | 'downloading' | 'done' | 'error'
  progress: number
  filePath?: string
  error?: string
}

export const store = new Store<StoreSchema>({
  defaults: {
    musicDir: '',
    volume: 0.8,
    downloads: [],
    library: []
  }
})
