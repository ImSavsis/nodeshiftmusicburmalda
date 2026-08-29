# BurmaldaMusic

музыкальный плеер + загрузчик.

youtube / spotify / soundcloud / applemusic → FLAC

discordRPC: слушает BurmaldaMusic

## запуск

```
npm install
npm run dev
```

## сборка exe

скачай `yt-dlp.exe` и `ffmpeg.exe` в `resources/` и:

```
npm run dist:win
```

## сервер (192.168.0.243)

```
cd server
cp .env.example .env  # заполни секрет
npm install
npm start
```

nginx: `burmalda.nodeshift.space` → `localhost:3100`
