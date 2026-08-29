export interface Track {
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

export interface DownloadItem {
  id: string
  url: string
  title?: string
  status: 'queued' | 'downloading' | 'done' | 'error'
  progress: number
  speed?: string
  eta?: string
  filePath?: string
  error?: string
}

export interface VideoFormat {
  format_id: string
  resolution: string
  ext: string
  filesize?: number
}
