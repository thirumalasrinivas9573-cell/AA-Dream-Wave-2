# MJ Voice Intelligence Platform (Sprint 5)

**Version:** 0.5.0-alpha  
**Module:** `server/src/mj/voice/`

## Overview

The MJ Voice Intelligence Platform provides a provider-agnostic, event-driven voice interface that integrates with the existing AI Brain, Memory Engine, Planner, and Agent systems. Voice is a first-class input method — not a bolt-on speech recognizer.

Dream Wave auth, UI, Firebase, existing routes, and MongoDB collections are **not modified**.

---

## Voice Pipeline

Every voice interaction flows through MJ's central systems:

```
Voice Input
    ↓
Speech Recognition (STT Provider)
    ↓
AI Brain (ReasoningPipeline)
    ↓
Memory (MemoryPipeline)
    ↓
Planner
    ↓
Agent Manager
    ↓
Response Builder
    ↓
Speech Synthesis (TTS Provider)
    ↓
Frontend Delivery
```

Implementation: `voice/pipeline/VoicePipeline.js`

---

## Voice States

Event-driven state machine (`VoiceStateMachine.js`):

| State | Description |
|-------|-------------|
| `sleeping` | Voice inactive |
| `wake_detection` | Listening for wake word |
| `listening` | Capturing audio |
| `understanding` | STT in progress |
| `thinking` | AI Brain processing |
| `planning` | Planner active |
| `working` | Agent execution |
| `speaking` | TTS output |
| `waiting` | Awaiting next input |
| `offline` | No connectivity |
| `muted` | Output suppressed |
| `error` | Recoverable error |

---

## Wake Word Engine

Configurable wake-word support (`wake/WakeWordEngine.js`):

- Default wake word: **"MJ"**
- Multiple wake words
- Sensitivity and threshold settings
- Modes: `push_to_talk`, `continuous`, `wake_word`
- Always-listening (disabled by default)

Architecture stub — hardware-specific detection deferred to client/local runtime.

---

## Speech Recognition (STT)

Provider abstraction via `STTProviderRegistry`:

| Provider | Key |
|----------|-----|
| OpenAI | `openai` |
| Google Speech | `google` |
| Azure Speech | `azure` |
| Deepgram | `deepgram` |
| Local Whisper | `whisper_local` |
| Browser Speech API | `browser` |

Features (interface-ready):
- Streaming transcription
- Interim results
- Final transcription
- Confidence scores
- Language detection
- Noise filtering (`INoiseFilter`)
- Silence detection (`ISilenceDetector`)

---

## Voice Synthesis (TTS)

Provider abstraction via `TTSProviderRegistry`:

| Provider | Key |
|----------|-----|
| ElevenLabs | `elevenlabs` |
| OpenAI TTS | `openai` |
| Azure TTS | `azure` |
| Google TTS | `google` |
| Local TTS | `local` |

Features (interface-ready):
- Voice profiles (natural female default)
- Pitch, speed, emotion, volume
- Pause control
- Streaming synthesis
- Voice cloning (extension point — not implemented)

---

## Voice Personality

`VoicePersonality.js` — configurable assistant persona:

- Professional, calm, intelligent, friendly, respectful, confident
- Configurable greeting style (not hardcoded phrases)
- Speech hints passed to TTS providers

---

## Voice Events

| Event | Constant |
|-------|----------|
| Voice started | `mj:voice:started` |
| Voice stopped | `mj:voice:stopped` |
| Wake detected | `mj:voice:wake_detected` |
| Microphone granted | `mj:voice:microphone_granted` |
| Microphone denied | `mj:voice:microphone_denied` |
| Transcription started | `mj:voice:transcription_started` |
| Transcription completed | `mj:voice:transcription_completed` |
| Speech started | `mj:voice:speech_started` |
| Speech completed | `mj:voice:speech_completed` |
| Voice error | `mj:voice:error` |
| State changed | `mj:voice:state_changed` |

---

## API Endpoints

All under `/api/mj/voice` — isolated from Dream Wave routes.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/voice/status?userId=` | Voice subsystem status |
| POST | `/voice/wake` | Wake voice session |
| POST | `/voice/sleep` | End voice session |
| POST | `/voice/listen` | Process voice input (transcript or audio) |
| POST | `/voice/stop` | Stop listening |
| GET | `/voice/settings?userId=` | Get user voice settings |
| PUT | `/voice/settings` | Update user voice settings |
| POST | `/voice/speak` | TTS-only (no brain) |

---

## Voice Settings (Per User)

Stored in `VoiceSettingsStore` (in-memory, persistence hook ready):

- Wake word / wake words
- STT and TTS providers
- Language and accent
- Voice profile
- Speech speed and volume
- Auto speak, push-to-talk, continuous listening

---

## Security

- Microphone permission via `PermissionManager`
- Rate limiting per user (`VoiceSecurity`)
- Provider permission hooks
- API keys never exposed in responses
- All voice ops require `userId`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MJ_VOICE_ENABLED` | Enable voice platform |
| `MJ_VOICE_STT_PROVIDER` | STT provider key |
| `MJ_VOICE_TTS_PROVIDER` | TTS provider key |
| `MJ_VOICE_WAKE_WORD` | Default wake word |
| `MJ_VOICE_LANGUAGE` | Language code |
| `MJ_ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `MJ_ELEVENLABS_VOICE_ID` | ElevenLabs voice ID |
| `MJ_DEEPGRAM_API_KEY` | Deepgram STT |
| `MJ_AZURE_SPEECH_KEY` | Azure Speech |
| `MJ_WHISPER_LOCAL_ENDPOINT` | Local Whisper endpoint |

---

## File Structure

```
voice/
├── VoiceEngine.js           # Orchestrator
├── constants.js             # States, events, providers
├── pipeline/VoicePipeline.js
├── state/VoiceStateMachine.js
├── wake/WakeWordEngine.js
├── stt/STTProviderRegistry.js
├── tts/TTSProviderRegistry.js
├── personality/VoicePersonality.js
├── session/VoiceSessionManager.js
├── settings/VoiceSettingsStore.js
├── security/VoiceSecurity.js
├── observability/VoiceObservability.js
└── interfaces/              # STT, TTS, noise, silence
```

See also: `VOICE_PROVIDER_GUIDE.md`, `VOICE_DEVELOPER_GUIDE.md`
