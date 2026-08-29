import fs from 'fs'
import path from 'path'
import { parseFile } from 'music-metadata'
import { store, type TrackMeta } from './store'
import { nanoid } from './utils'

const AUDIO_EXTS = ['.flac', '.mp3', '.m4a', '.ogg', '.wav', '.opus', '.aac']

export async function scanLibrary(dir: string): Promise<TrackMeta[]> {
  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir)
    .filter(f => AUDIO_EXTS.includes(path.extname(f).toLowerCase()))
    .map(f => path.join(dir, f))

  const tracks: TrackMeta[] = []

  for (const filePath of files) {
    try {
      const meta = await parseFile(filePath, { duration: true, skipCovers: false })
      const cover = meta.common.picture?.[0]

      let coverPath: string | undefined
      if (cover) {
        const coverDir = path.join(dir, '.covers')
        if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir)
        const coverFile = path.join(coverDir, `${path.basename(filePath, path.extname(filePath))}.jpg`)
        if (!fs.existsSync(coverFile)) {
          fs.writeFileSync(coverFile, cover.data)
        }
        coverPath = coverFile
      }

      tracks.push({
        id: nanoid(),
        title: meta.common.title || path.basename(filePath, path.extname(filePath)),
        artist: meta.common.artist || meta.common.albumartist || '',
        album: meta.common.album || '',
        duration: meta.format.duration || 0,
        filePath,
        coverPath,
        source: 'local',
        addedAt: fs.statSync(filePath).mtimeMs
      })
    } catch {
      tracks.push({
        id: nanoid(),
        title: path.basename(filePath, path.extname(filePath)),
        artist: '',
        album: '',
        duration: 0,
        filePath,
        source: 'local',
        addedAt: Date.now()
      })
    }
  }

  return tracks
}

export async function mergeLibrary(dir: string): Promise<TrackMeta[]> {
  const scanned = await scanLibrary(dir)
  const existing = store.get('library') as TrackMeta[]

  const merged = [...existing]
  for (const track of scanned) {
    if (!merged.find(t => t.filePath === track.filePath)) {
      merged.unshift(track)
    }
  }

  store.set('library', merged)
  return merged
}
