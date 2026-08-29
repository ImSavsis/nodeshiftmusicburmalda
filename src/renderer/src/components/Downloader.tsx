import { useState } from 'react'
import { useStore } from '../store'
import type { VideoFormat } from '../types'

export function Downloader() {
  const { queue } = useStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [formats, setFormats] = useState<VideoFormat[] | null>(null)
  const [pendingUrl, setPendingUrl] = useState('')
  const [mode, setMode] = useState<'audio' | 'video'>('audio')

  const isYoutube = (u: string) =>
    u.includes('youtube.com') || u.includes('youtu.be')

  const handleDownload = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      if (mode === 'video' && isYoutube(url)) {
        const fmts = await window.api.getFormats(url)
        setPendingUrl(url)
        setFormats(fmts)
      } else {
        await window.api.downloadAudio(url.trim())
        setUrl('')
      }
    } finally {
      setLoading(false)
    }
  }

  const pickFormat = async (fmt: VideoFormat) => {
    setFormats(null)
    await window.api.downloadVideo(pendingUrl, fmt.format_id)
    setUrl('')
    setPendingUrl('')
  }

  const activeCount = queue.filter(d => d.status === 'downloading' || d.status === 'queued').length

  return (
    <div>
      <div className="section-title">Загрузка</div>
      <div className="section-sub">YouTube · Spotify · SoundCloud · Apple Music</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['audio', 'video'] as const).map(m => (
          <button
            key={m}
            className={`btn ${mode === m ? '' : 'secondary'}`}
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setMode(m)}
          >
            {m === 'audio' ? '🎵 Аудио (FLAC)' : '🎬 Видео'}
          </button>
        ))}
      </div>

      <div className="dl-input-row">
        <input
          className="dl-input"
          placeholder="Вставьте ссылку..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleDownload()}
        />
        <button className="btn" onClick={handleDownload} disabled={loading || !url.trim()}>
          {loading ? '...' : 'Скачать'}
        </button>
      </div>

      {formats && (
        <div className="formats-modal" onClick={() => setFormats(null)}>
          <div className="formats-box" onClick={e => e.stopPropagation()}>
            <div className="formats-title">Выберите качество</div>
            {formats.length === 0 && <div style={{ color: 'var(--text3)' }}>Форматы не найдены</div>}
            {formats.map(f => (
              <div key={f.format_id} className="format-row" onClick={() => pickFormat(f)}>
                <div className="format-res">{f.resolution}</div>
                <div className="format-info">
                  {f.ext.toUpperCase()}
                  {f.filesize ? ` · ${(f.filesize / 1024 / 1024).toFixed(1)} MB` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Очередь {activeCount > 0 && <span className="badge">{activeCount}</span>}
          </div>
          {[...queue].reverse().map(item => (
            <div key={item.id} className="dl-item">
              <div className="dl-item-header">
                <div className="dl-item-title">{item.url}</div>
                <span className={`dl-item-status status-${item.status}`}>
                  {item.status === 'queued' ? 'в очереди'
                    : item.status === 'downloading' ? 'скачивается'
                    : item.status === 'done' ? 'готово'
                    : 'ошибка'}
                </span>
              </div>
              <div className="dl-bar-bg">
                <div className="dl-bar-fill" style={{ width: `${item.progress}%` }} />
              </div>
              <div className="dl-item-meta">
                <span>{item.progress.toFixed(0)}%</span>
                <span>{item.speed || ''} {item.eta ? `· ${item.eta}` : ''}</span>
              </div>
              {item.error && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 6 }}>{item.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
