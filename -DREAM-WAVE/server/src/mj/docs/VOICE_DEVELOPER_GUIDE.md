# MJ Voice Developer Guide

## Quick Start

```bash
# Check voice status
curl "http://localhost:5001/api/mj/voice/status?userId=u1"

# Wake voice session
curl -X POST http://localhost:5001/api/mj/voice/wake \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1"}'

# Process voice input (transcript)
curl -X POST http://localhost:5001/api/mj/voice/listen \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","transcript":"What is the project status?"}'

# Speak text (TTS only)
curl -X POST http://localhost:5001/api/mj/voice/speak \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","text":"Welcome back."}'

# Update settings
curl -X PUT http://localhost:5001/api/mj/voice/settings \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","wakeWord":"MJ","speechSpeed":1.1,"autoSpeak":true}'
```

## Programmatic Access

```javascript
const { getMJ } = require('./src/mj/MJController')

const mj = getMJ()
mj.start()

// Full voice pipeline
const result = await mj.processVoiceInput({
  userId: 'u1',
  transcript: 'Help me plan the sprint',
  sessionId: 'voice-session-1',
})

console.log(result.transcription.text)
console.log(result.response?.content)
console.log(result.speech?.durationMs)
```

## Event Subscriptions

```javascript
const { getMJ } = require('./src/mj/MJController')
const { VOICE_EVENTS } = require('./src/mj/voice/constants')

getMJ().getEventBus().onEvent(VOICE_EVENTS.WAKE_DETECTED, (payload) => {
  console.log('Wake word:', payload.wakeWord)
})

getMJ().getEventBus().onEvent(VOICE_EVENTS.TRANSCRIPTION_COMPLETED, (payload) => {
  console.log('Heard:', payload.text)
})
```

## Wake Word Flow

1. User calls `POST /voice/wake` with `mode: wake_word`
2. `WakeWordEngine.start()` activates detection
3. Client sends audio/transcript to `/voice/listen`
4. Engine calls `wakeWord.detect({ transcript, confidence })`
5. On match → `WAKE_DETECTED` event → pipeline continues
6. Command portion extracted and sent to AI Brain

## Interruptible Speech (Future)

Architecture prepared in `VoiceEngine`:
- `stop()` transitions to `waiting`
- TTS providers should support cancellation tokens in `streamSynthesize()`
- Client sends `POST /voice/stop` during playback

## Integration with Memory

Voice sessions pass `source: 'voice'` in metadata. The Memory Pipeline automatically stores conversation memories from voice interactions when processed through `processCommand`.

## Health Check

```bash
curl http://localhost:5001/api/mj/health
# includes voice: { state, sttProviders, ttsProviders, metrics }
```

## Do Not Bypass MJ

All voice clients must use `/api/mj/voice/*` endpoints. Never call STT/TTS providers directly from frontend with exposed API keys.

Browser Speech API should run client-side and send **transcripts** to `/voice/listen`, not raw provider credentials.
