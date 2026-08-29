import DiscordRPC from 'discord-rpc'

const CLIENT_ID = '1498024819675889704'

let rpc: DiscordRPC.Client | null = null
let connected = false

export async function initDiscordRPC() {
  DiscordRPC.register(CLIENT_ID)
  rpc = new DiscordRPC.Client({ transport: 'ipc' })

  rpc.on('ready', () => {
    connected = true
  })

  rpc.on('disconnected', () => {
    connected = false
    setTimeout(initDiscordRPC, 5000)
  })

  try {
    await rpc.login({ clientId: CLIENT_ID })
  } catch {
    connected = false
    setTimeout(initDiscordRPC, 10000)
  }
}

export interface NowPlaying {
  title: string
  artist: string
  albumArt?: string
  trackId?: string
  startedAt?: number
}

export function setActivity(track: NowPlaying | null) {
  if (!rpc || !connected) return

  if (!track) {
    rpc.clearActivity().catch(() => {})
    return
  }

  const activity: DiscordRPC.Presence = {
    details: track.title,
    state: `by ${track.artist || 'Unknown'}`,
    largeImageKey: 'burmalda_logo',
    largeImageText: 'BurmaldaMusic',
    startTimestamp: track.startedAt ? new Date(track.startedAt) : undefined,
    instance: false,
    buttons: [
      {
        label: 'Слушать вместе',
        url: `https://burmalda.nodeshift.space/listen/${track.trackId || 'track'}`
      }
    ]
  }

  if (track.albumArt) {
    activity.smallImageKey = track.albumArt
    activity.smallImageText = track.title
  }

  rpc.setActivity(activity).catch(() => {})
}

export function destroyRPC() {
  if (rpc) {
    rpc.destroy().catch(() => {})
    rpc = null
    connected = false
  }
}
