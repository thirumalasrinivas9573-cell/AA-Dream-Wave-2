# Twilio Verify — Dream Wave installation notes

## 1. Install

```bash
cd server
npm install          # includes `twilio`
cd ../client
npm install
```

## 2. Configure environment

Copy `server/.env.example` → `server/.env` and set:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (`AC…`) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_VERIFY_SERVICE_SID` | Verify Service SID (`VA…`) |

Never commit `.env` or hardcode credentials.

## 3. Twilio Console

1. Verify → Services → Create service (e.g. `DreamWave`)
2. Enable SMS channel
3. Copy Service SID into `.env`

## 4. Run

```bash
# Terminal A
cd server && npm run dev:memory

# Terminal B
cd client && npm run dev -- --host 127.0.0.1 --port 5173
```

## 5. Manual smoke test

1. Open `/student/signup`
2. Enter name, email, E.164 mobile, password → **Send OTP**
3. Confirm SMS arrives; enter 6-digit code → account created + JWT
4. Open `/student/login` → email/mobile + password → OTP → dashboard

## 6. Automated tests

```bash
cd server && npm test
```
