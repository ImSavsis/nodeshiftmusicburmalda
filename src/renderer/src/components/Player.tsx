import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store'

function fmt(s: number): string {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function Player() {
  const {
    currentTrack, isPlaying, volume, currentTime, duration,
    library,
    setIsPlaying, setVolume, setCurrentTime, setDuration, setCurrentTrack
  } = useStore()

  const audioRef = useRef<HTMLAudioElement>(null)
  const startedAt = useRef<number>(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (currentTrack) {
      const url = `media://${currentTrack.filePath.replace(/\\/g, '/')}`
      if (audio.src !== url) {
        audio.src = url
        audio.load()
        startedAt.current = Date.now()
      }
      if (isPlaying) {
        audio.play().catch(() => {})
      } else {
        audio.pause()
      }

      window.api.setNowPlaying({
        title: currentTrack.title,
        artist: currentTrack.artist,
        trackId: currentTrack.id,
        albumArt: currentTrack.coverUrl,
        startedAt: startedAt.current
      })
    } else {
      audio.pause()
      audio.src = ''
      window.api.setNowPlaying(null)
    }
  }, [currentTrack, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
  }, [volume])

  const togglePlay = () => {
    if (!currentTrack) return
    setIsPlaying(!isPlaying)
  }

  const playNext = useCallback(() => {
    if (!currentTrack || !library.length) return
    const idx = library.findIndex(t => t.id === currentTrack.id)
    const next = library[(idx + 1) % library.length]
    setCurrentTrack(next)
    setIsPlaying(true)
  }, [currentTrack, library, setCurrentTrack, setIsPlaying])

  const playPrev = useCallback(() => {
    if (!currentTrack || !library.length) return
    const idx = library.findIndex(t => t.id === currentTrack.id)
    const prev = library[(idx - 1 + library.length) % library.length]
    setCurrentTrack(prev)
    setIsPlaying(true)
  }, [currentTrack, library, setCurrentTrack, setIsPlaying])

  const onProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audio.currentTime = ratio * duration
  }

  const cover = currentTrack?.coverPath
    ? `media://${currentTrack.coverPath.replace(/\\/g, '/')}`
    : null

  return (
    <div className="player">
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={playNext}
      />

      <div className="player-info">
        <div className="player-cover">
          {cover ? <img src={cover} alt="" /> : '♪'}
        </div>
        <div className="player-meta">
          <div className="player-title">{currentTrack?.title || '—'}</div>
          <div className="player-artist">{currentTrack?.artist || ''}</div>
        </div>
      </div>

      <div className="player-controls">
        <div className="ctrl-buttons">
          <button className="ctrl-btn" onClick={playPrev}>⏮</button>
          <button className="ctrl-btn play" onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="ctrl-btn" onClick={playNext}>⏭</button>
        </div>

        <div className="progress-row">
          <span className="time">{fmt(currentTime)}</span>
          <div className="progress-bar" onClick={onProgressClick}>
            <div
              className="progress-fill"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <span className="time">{fmt(duration)}</span>
        </div>
      </div>

      <div className="volume-ctrl">
        <span className="volume-btn">🔊</span>
        <div className="progress-bar volume-bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            setVolume(v)
            window.api.setVolume(v)
          }}
        >
          <div className="progress-fill" style={{ width: `${volume * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
