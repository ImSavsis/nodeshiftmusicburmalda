import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { store, type TrackMeta } from './store'
import { nanoid } from './utils'

const isDev = !app.isPackaged

function getBinPath(name: string): string {
  if (isDev) {
    return path.join(process.cwd(), 'resources', name)
  }
  return path.join(process.resourcesPath, name)
}

export const dlEmitter = new EventEmitter()

export interface QueueItem {
  id: string
  url: string
  title?: string
  quality?: string
  status: 'queued' | 'downloading' | 'done' | 'error'
  progress: number
  speed?: string
  eta?: string
  filePath?: string
  error?: string
}

const queue: QueueItem[] = []
let active = 0
const MAX_CONCURRENT = 2

export function getQueue(): QueueItem[] {
  return queue
}

export function addToQueue(url: string, quality = 'bestaudio', title?: string): string {
  const id = nanoid()
  const item: QueueItem = { id, url, quality, title, status: 'queued', progress: 0 }
  queue.push(item)
  dlEmitter.emit('queue-update', queue)
  processQueue()
  return id
}

function processQueue() {
  if (active >= MAX_CONCURRENT) return
  const next = queue.find(i => i.status === 'queued')
  if (!next) return
  active++
  next.status = 'downloading'
  dlEmitter.emit('queue-update', queue)
  downloadItem(next).finally(() => {
    active--
    processQueue()
  })
}

async function downloadItem(item: QueueItem): Promise<void> {
  const musicDir = store.get('musicDir') || path.join(app.getPath('music'), 'BurmaldaMusic')
  if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true })

  const ytdlp = getBinPath('yt-dlp.exe')
  const ffmpeg = getBinPath('ffmpeg.exe')

  if (!fs.existsSync(ytdlp)) {
    item.status = 'error'
    item.error = 'yt-dlp.exe not found in resources'
    dlEmitter.emit('queue-update', queue)
    return
  }

  const outTemplate = path.join(musicDir, '%(uploader)s - %(title)s.%(ext)s')

  const args = [
    item.url,
    '-x',
    '--audio-format', 'flac',
    '--audio-quality', '0',
    '-o', outTemplate,
    '--embed-thumbnail',
    '--embed-metadata',
    '--add-metadata',
    '--no-playlist',
    '--continue',
    '--extractor-args', 'youtube:player_client=web_creator,web',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    '--ffmpeg-location', path.dirname(ffmpeg),
    '--newline',
    '--progress'
  ]

  if (item.url.includes('spotify.com')) {
    return downloadSpotify(item, musicDir, ffmpeg)
  }

  return new Promise((resolve) => {
    const proc = spawn(ytdlp, args)
    let lastFile = ''

    proc.stdout.on('data', (data: Buffer) => {
      const line = data.toString()

      const progressMatch = line.match(/(\d+\.?\d*)%/)
      if (progressMatch) {
        item.progress = parseFloat(progressMatch[1])
      }

      const speedMatch = line.match(/at\s+(\S+\/s)/)
      if (speedMatch) item.speed = speedMatch[1]

      const etaMatch = line.match(/ETA\s+(\d+:\d+)/)
      if (etaMatch) item.eta = etaMatch[1]

      const destMatch = line.match(/\[ExtractAudio\] Destination: (.+)/)
      if (destMatch) lastFile = destMatch[1].trim()

      const mergeMatch = line.match(/\[Merger\] Merging formats into "(.+)"/)
      if (mergeMatch) lastFile = mergeMatch[1].trim()

      dlEmitter.emit('queue-update', queue)
      dlEmitter.emit('download-progress', { id: item.id, progress: item.progress, speed: item.speed, eta: item.eta })
    })

    proc.stderr.on('data', (data: Buffer) => {
      const line = data.toString()
      if (line.includes('403')) {
        proc.kill()
        retrywithCookies(item, args, musicDir).then(resolve)
        return
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        item.status = 'done'
        item.progress = 100
        item.filePath = lastFile
        addToLibrary(item)
      } else {
        item.status = 'error'
        item.error = `Exit code ${code}`
      }
      dlEmitter.emit('queue-update', queue)
      resolve()
    })
  })
}

async function retrywithCookies(item: QueueItem, originalArgs: string[], musicDir: string): Promise<void> {
  const ytdlp = getBinPath('yt-dlp.exe')
  const ffmpeg = getBinPath('ffmpeg.exe')

  const args = [
    item.url,
    '-x',
    '--audio-format', 'flac',
    '--audio-quality', '0',
    '-o', path.join(musicDir, '%(uploader)s - %(title)s.%(ext)s'),
    '--embed-thumbnail',
    '--embed-metadata',
    '--cookies-from-browser', 'chrome',
    '--no-playlist',
    '--continue',
    '--ffmpeg-location', path.dirname(ffmpeg),
    '--newline',
    '--progress'
  ]

  return new Promise((resolve) => {
    const proc = spawn(ytdlp, args)
    let lastFile = ''

    proc.stdout.on('data', (data: Buffer) => {
      const line = data.toString()
      const m = line.match(/(\d+\.?\d*)%/)
      if (m) item.progress = parseFloat(m[1])
      const dest = line.match(/Destination: (.+)/)
      if (dest) lastFile = dest[1].trim()
      dlEmitter.emit('download-progress', { id: item.id, progress: item.progress })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        item.status = 'done'
        item.progress = 100
        item.filePath = lastFile
        addToLibrary(item)
      } else {
        item.status = 'error'
        item.error = 'Failed even with cookies'
      }
      dlEmitter.emit('queue-update', queue)
      resolve()
    })
  })
}

async function downloadSpotify(item: QueueItem, musicDir: string, ffmpeg: string): Promise<void> {
  const ytdlp = getBinPath('yt-dlp.exe')
  const args = [
    item.url,
    '-x',
    '--audio-format', 'flac',
    '--audio-quality', '0',
    '-o', path.join(musicDir, '%(uploader)s - %(title)s.%(ext)s'),
    '--embed-thumbnail',
    '--embed-metadata',
    '--no-playlist',
    '--continue',
    '--ffmpeg-location', path.dirname(ffmpeg),
    '--newline',
    '--progress'
  ]

  return new Promise((resolve) => {
    const proc = spawn(ytdlp, args)
    let lastFile = ''

    proc.stdout.on('data', (data: Buffer) => {
      const line = data.toString()
      const m = line.match(/(\d+\.?\d*)%/)
      if (m) item.progress = parseFloat(m[1])
      const dest = line.match(/Destination: (.+)/)
      if (dest) lastFile = dest[1].trim()
      dlEmitter.emit('download-progress', { id: item.id, progress: item.progress })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        item.status = 'done'
        item.progress = 100
        item.filePath = lastFile
        addToLibrary(item)
      } else {
        item.status = 'error'
        item.error = `Spotify download failed (${code})`
      }
      dlEmitter.emit('queue-update', queue)
      resolve()
    })
  })
}

function addToLibrary(item: QueueItem) {
  if (!item.filePath) return
  const library = store.get('library') as TrackMeta[]
  const existing = library.find(t => t.filePath === item.filePath)
  if (existing) return

  const track: TrackMeta = {
    id: nanoid(),
    title: item.title || path.basename(item.filePath, path.extname(item.filePath)),
    artist: '',
    album: '',
    duration: 0,
    filePath: item.filePath,
    source: detectSource(item.url),
    addedAt: Date.now()
  }
  library.unshift(track)
  store.set('library', library)
  dlEmitter.emit('library-update', library)
}

function detectSource(url: string): TrackMeta['source'] {
  if (url.includes('spotify.com')) return 'spotify'
  if (url.includes('soundcloud.com')) return 'soundcloud'
  if (url.includes('music.apple.com')) return 'applemusic'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  return 'local'
}

export async function getVideoFormats(url: string): Promise<{ format_id: string; resolution: string; ext: string; filesize?: number }[]> {
  const ytdlp = getBinPath('yt-dlp.exe')
  return new Promise((resolve) => {
    const proc = spawn(ytdlp, [url, '-J', '--no-playlist'])
    let json = ''
    proc.stdout.on('data', (d: Buffer) => { json += d.toString() })
    proc.on('close', () => {
      try {
        const data = JSON.parse(json)
        const formats = (data.formats || []).filter((f: any) => f.vcodec !== 'none')
        resolve(formats.map((f: any) => ({
          format_id: f.format_id,
          resolution: f.resolution || `${f.height}p`,
          ext: f.ext,
          filesize: f.filesize
        })))
      } catch {
        resolve([])
      }
    })
  })
}

export async function downloadVideo(url: string, formatId: string, outputDir: string): Promise<void> {
  const ytdlp = getBinPath('yt-dlp.exe')
  const ffmpeg = getBinPath('ffmpeg.exe')
  const id = nanoid()
  const item: QueueItem = { id, url, status: 'downloading', progress: 0 }
  queue.push(item)

  const args = [
    url,
    '-f', formatId,
    '-o', path.join(outputDir, '%(title)s.%(ext)s'),
    '--no-playlist',
    '--continue',
    '--ffmpeg-location', path.dirname(ffmpeg),
    '--newline',
    '--progress'
  ]

  return new Promise((resolve) => {
    const proc = spawn(ytdlp, args)
    proc.stdout.on('data', (data: Buffer) => {
      const m = data.toString().match(/(\d+\.?\d*)%/)
      if (m) {
        item.progress = parseFloat(m[1])
        dlEmitter.emit('download-progress', { id, progress: item.progress })
      }
    })
    proc.on('close', () => {
      item.status = 'done'
      dlEmitter.emit('queue-update', queue)
      resolve()
    })
  })
}
