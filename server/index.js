require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { WebSocketServer } = require('ws')
const http = require('http')
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const PORT = process.env.PORT || 3100
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1498024819675889704'
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://music.nodeshift.space/api/discord/callback'

app.use(cors())
app.use(express.json())

const listenRooms = new Map()

app.get('/health', (req, res) => res.json({ ok: true }))

app.get('/api/discord/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).send('Missing code')

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    })

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const tokenData = await tokenRes.json()

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const user = await userRes.json()

    res.redirect(`burmalda://auth?token=${tokenData.access_token}&user=${encodeURIComponent(JSON.stringify(user))}`)
  } catch (err) {
    console.error(err)
    res.status(500).send('Auth failed')
  }
})

app.get('/listen/:trackId', (req, res) => {
  const { trackId } = req.params
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>BurmaldaMusic</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0a0a;color:#f0f0f0;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:20px}
    .logo{font-size:48px}
    h1{font-size:22px;font-weight:700}
    p{color:#888;font-size:14px}
    a{display:inline-block;margin-top:20px;background:#7c6af7;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600}
  </style>
</head>
<body>
  <div class="logo">🎵</div>
  <h1>BurmaldaMusic</h1>
  <p>Трек: ${trackId}</p>
  <a href="burmalda://listen/${trackId}">Открыть в приложении</a>
  <p style="margin-top:16px;font-size:12px;color:#444">Если приложение не открылось — установите BurmaldaMusic</p>
</body>
</html>`)
})

const rooms = new Map()

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const roomId = url.searchParams.get('room')
  const userId = url.searchParams.get('user')

  if (!roomId) { ws.close(); return }

  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  rooms.get(roomId).add(ws)

  ws.on('message', (data) => {
    const room = rooms.get(roomId)
    if (!room) return
    room.forEach(client => {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString())
      }
    })
  })

  ws.on('close', () => {
    const room = rooms.get(roomId)
    if (room) {
      room.delete(ws)
      if (room.size === 0) rooms.delete(roomId)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Burmalda server on :${PORT}`)
})
