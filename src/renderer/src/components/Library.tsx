import { useStore } from '../store'
import type { Track } from '../types'

function fmt(s: number): string {
  if (!s || isNaN(s)) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export function Library() {
  const { library, currentTrack, isPlaying, searchQuery, setCurrentTrack, setIsPlaying } = useStore()

  const filtered = library.filter(t =>
    !searchQuery ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const play = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentTrack(track)
      setIsPlaying(true)
    }
  }

  if (!filtered.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎵</div>
        <div className="empty-text">
          {searchQuery ? 'Ничего не найдено' : 'Библиотека пуста. Скачайте музыку!'}
        </div>
      </div>
    )
  }

  return (
    <div className="track-list">
      {filtered.map(track => {
        const isActive = currentTrack?.id === track.id
        const cover = track.coverPath
          ? `media://${track.coverPath.replace(/\\/g, '/')}`
          : null

        return (
          <div
            key={track.id}
            className={`track-item${isActive ? ' active' : ''}`}
            onDoubleClick={() => play(track)}
            onClick={() => play(track)}
          >
            <div className="track-cover">
              {cover ? <img src={cover} alt="" loading="lazy" /> : '♪'}
            </div>
            <div className="track-info">
              <div className="track-title">
                {isActive && isPlaying ? '▶ ' : ''}{track.title}
              </div>
              <div className="track-artist">{track.artist || 'Unknown artist'}</div>
            </div>
            <div className="track-duration">{fmt(track.duration)}</div>
          </div>
        )
      })}
    </div>
  )
}
