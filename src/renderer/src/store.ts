import { create } from 'zustand'
import type { Track, DownloadItem } from './types'

interface AppState {
  library: Track[]
  queue: DownloadItem[]
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  view: 'library' | 'downloads' | 'youtube'
  searchQuery: string

  setLibrary: (lib: Track[]) => void
  setQueue: (q: DownloadItem[]) => void
  setCurrentTrack: (t: Track | null) => void
  setIsPlaying: (v: boolean) => void
  setVolume: (v: number) => void
  setCurrentTime: (v: number) => void
  setDuration: (v: number) => void
  setView: (v: AppState['view']) => void
  setSearchQuery: (q: string) => void
  updateDownload: (id: string, update: Partial<DownloadItem>) => void
}

export const useStore = create<AppState>((set) => ({
  library: [],
  queue: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  view: 'library',
  searchQuery: '',

  setLibrary: (library) => set({ library }),
  setQueue: (queue) => set({ queue }),
  setCurrentTrack: (currentTrack) => set({ currentTrack }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setView: (view) => set({ view }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  updateDownload: (id, update) => set((state) => ({
    queue: state.queue.map(d => d.id === id ? { ...d, ...update } : d)
  }))
}))
