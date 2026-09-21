# MJ Voice Provider Guide

## Adding an STT Provider

1. Create a class extending `ISTTProvider` in `voice/stt/providers/`
2. Implement `name`, `isAvailable()`, `transcribe()`, `streamTranscribe()`
3. Register in `STTProviderRegistry._registerDefaults()`

```javascript
const { ISTTProvider } = require('../../interfaces/ISTTProvider')

class MySTTProvider extends ISTTProvider {
  get name() { return 'my_provider' }
  isAvailable() { return !!this._config.apiKey }
  async transcribe(input) {
    // Call external API
    return { text, confidence, language, isFinal: true }
  }
}
```

## Adding a TTS Provider

1. Create a class extending `ITTSProvider` in `voice/tts/providers/`
2. Implement `name`, `isAvailable()`, `synthesize()`, `streamSynthesize()`
3. Register in `TTSProviderRegistry._registerDefaults()`

```javascript
const { ITTSProvider } = require('../../interfaces/ITTSProvider')

class MyTTSProvider extends ITTSProvider {
  get name() { return 'my_provider' }
  isAvailable() { return !!this._config.apiKey }
  async synthesize(input) {
    return { audio, format: 'audio/mpeg', durationMs, voiceProfile }
  }
  getVoiceProfiles() {
    return [{ id: 'default', name: 'MJ', gender: 'female', language: 'en' }]
  }
}
```

## Provider Selection

Configured via:
- Environment: `MJ_VOICE_STT_PROVIDER`, `MJ_VOICE_TTS_PROVIDER`
- Per-user settings: `PUT /api/mj/voice/settings`
- Runtime: `VoiceSettingsStore.update(userId, { sttProvider: 'deepgram' })`

Fallback chain:
- STT → `browser` (always available)
- TTS → `local` (always available)

## Voice Cloning (Future)

Extend `ITTSProvider` with:
```javascript
async cloneVoice(samples, profileId) { /* not implemented */ }
```

Register a dedicated cloning provider without modifying existing TTS interfaces.

## Streaming Architecture

Both STT and TTS support async iterables:

```javascript
for await (const chunk of provider.streamTranscribe({ audio })) {
  if (chunk.isFinal) { /* process final */ }
  else { /* show interim */ }
}
```

Wire streaming through `StreamService` for WebSocket delivery in future sprints.

## API Key Security

- Keys loaded only in `MJConfig._loadFromEnv()`
- Never returned via `/voice/status` or `/voice/settings`
- `VoiceSecurity.sanitizeProviderConfig()` strips secrets from responses
