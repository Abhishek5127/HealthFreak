# HealthFreak Deployment Guide: Stages 1–5 & Part 1

This document provides the exact end-to-end deployment steps, verification checks, and rollback procedures for all changes introduced across Stages 1–5 and Part 1 on branch `coach-context-v2`.

---

## 1. Summary of Changes Deployed

| Stage / Component | Key Deliverables |
| :--- | :--- |
| **Stage 1 (P2)** | Signed server-to-server Coach API (`verifyCoachSignature`), HMAC-SHA256 handshake for LiveKit worker. |
| **Stage 2 (P3)** | Health Memory Engine (`healthMemoryEngine.ts`), `user_issues` table, issue extraction and confirmation-gated resolution. |
| **Stage 3 (P4)** | Goal-Specific Diet & Workout Plan Generator (`planGenerator.ts`), home-only workouts, calorie/macro breakdowns. |
| **Stage 4 (Phase A)** | Onboarding call handling, session duration caps (3-5 min), goal-driven greetings. |
| **Stage 5** | Removal of all synthetic fallbacks from real user flows; migration `005_call_transcripts_and_extraction.sql`. |
| **Part 1** | Opener budget ($\le 5\%$, max 1 per 20 sentences), consecutive name gating, history hygiene (dedup + opener strip), streaming opener filter (`StreamingOpenerFilter`), dynamic runtime `PROMPT_VERSION` (`<sha>.<YYYYMMDD>`). |

---

## 1.1 Strict Deployment Order

Deploy components in the following exact sequence:
1. **Database Migration 005 (Supabase Postgres)**: Apply `005_call_transcripts_and_extraction.sql` so columns exist before code writes to them.
2. **Backend Server (Render)**: Deploy `healthfreak-1.onrender.com` on branch `coach-context-v2`. Verify `/health` returns status `ok` and runtime `promptVersion`.
3. **LiveKit Voice Agent Worker (`server/voice-agent`)**: Deploy and start Python worker. Verify startup log line shows `PROMPT_VERSION` and HMAC credentials.
4. **Mobile Client (Expo / EAS)**: Run `eas build -p android` (see Native EAS Build notice in Section 5).

---

## 2. Component A: Supabase Postgres Database

### Current Production Migration Status (Verified via Read-Only Audit)
- **Migration 001** (`001_health_memory_and_food_diary.sql`): **APPLIED** (tables `meals`, `meal_items`, etc. present).
- **Migration 002** (`002_daily_activity.sql`): **APPLIED** (table `activity_logs` present).
- **Migration 003** (`003_google_auth_and_rls.sql`): **APPLIED** (table `profiles`, RLS policies present).
- **Migration 004** (`004_coach_memory_and_daily_snapshots.sql`): **APPLIED** (table `user_issues`, `daily_health_snapshots` present).
- **Migration 005** (`005_call_transcripts_and_extraction.sql`): **PENDING** (`transcript` column exists, `summary` and `key_takeaways` missing).

### Pre-Deployment Checks
Ensure database connectivity and check if migration `005` has already run:
```bash
# From server/ directory
npx tsx -e "
import { SupabaseDb } from './src/db/supabaseClient';
async function check() {
  const p = SupabaseDb.getPool();
  const res = await p.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'transcript'\");
  console.log('Migration 005 status:', res.rows.length > 0 ? 'ALREADY APPLIED' : 'PENDING');
  await p.end();
}
check();
"
```

### Apply Migration (if pending)
If migration `005` is pending, run:
```bash
# Apply 005_call_transcripts_and_extraction.sql in Supabase SQL editor or via psql:
psql "$SUPABASE_DATABASE_URL" -f server/src/db/migrations/005_call_transcripts_and_extraction.sql
```

### Verification
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' AND column_name IN ('transcript', 'summary', 'key_takeaways');
```
*Expected Result*: 3 rows returned (`text` or `jsonb`).

### Rollback (Database)
If migration 005 needs to be rolled back:
```sql
ALTER TABLE calls DROP COLUMN IF EXISTS transcript;
ALTER TABLE calls DROP COLUMN IF EXISTS summary;
ALTER TABLE calls DROP COLUMN IF EXISTS key_takeaways;
```

---

## 3. Component B: Render Backend (`healthfreak-1.onrender.com`)

### Environment Variables
Verify the following variables in the Render Dashboard (**Environment** tab):
- `COACH_HMAC_SECRET`: Shared secret string matching the LiveKit voice agent.
- `SYNTHETIC_DATA_MODE`: `false` (in production).
- `SUPABASE_DATABASE_URL`: Connection string to Supabase pooler (port 6543, SSL mode enabled).
- `RENDER_GIT_COMMIT`: Automatically populated by Render (used for runtime `PROMPT_VERSION`).
- `DEV_TRANSCRIPT_LOG`: `0` or unset (prevents writing local `transcripts.jsonl` in production).

### Deploy Command
In Render Dashboard:
1. Connect repository branch `coach-context-v2` (or merge into `main` after sign-off).
2. Build Command: `cd server && npm install && npm run build`
3. Start Command: `cd server && npm run start`
4. Trigger manual deploy: **Manual Deploy** > **Deploy latest commit**.

### Verification
1. **Health Endpoint**:
   ```bash
   curl -s https://healthfreak-1.onrender.com/health | jq
   ```
   *Expected Output*:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-11-...",
     "promptVersion": "<short_sha>.<date>",
     "version": "1.0.0"
   }
   ```
2. **Debug Response Header**:
   ```bash
   curl -I -X POST https://healthfreak-1.onrender.com/api/voice/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"hello"}'
   ```
   *Verify Header Present*: `X-Prompt-Version: <short_sha>.<date>`

### Rollback (Render)
1. Go to **Deploys** in Render Dashboard.
2. Select the previous stable commit (e.g., prior to Stage 1 or Part 1).
3. Click **Rollback to this deploy**.

---

## 4. Component C: LiveKit Voice Agent Worker (`server/voice-agent`)

### Runner Environment
The LiveKit Python worker runs as an autonomous agent connecting to LiveKit Cloud / Server.
- Directory: `server/voice-agent/`
- Runtime: Python 3.10+
- Dependencies: `pip install -r requirements.txt`

### Environment Variables
Verify the `.env` or system environment of the voice worker:
- `LIVEKIT_URL`: `wss://healthfreak-....livekit.cloud`
- `LIVEKIT_API_KEY`: API Key
- `LIVEKIT_API_SECRET`: API Secret
- `COACH_HMAC_SECRET`: Matching backend `COACH_HMAC_SECRET`
- `BACKEND_URL`: `https://healthfreak-1.onrender.com` (or internal VPC host)

### Startup
```bash
cd server/voice-agent
python agent.py dev   # For local/dev runner
# Or systemd / Docker container in production:
# python agent.py start
```

### Verification
Inspect worker startup logs:
```text
[VoiceAgent] Starting LiveKit Voice Agent (PROMPT_VERSION: <short_sha>.<date>)
[VoiceAgent] HMAC signing configured: True
[VoiceAgent] Opener budget initialized: 0/20 allowed (5.00% target)
```

### Rollback (Voice Worker)
```bash
git checkout <previous_commit> server/voice-agent
systemctl restart healthfreak-voice-agent # or restart container
```

---

## 5. Component D: Expo Mobile App (React Native)

### Native Build Status & EAS Update Compatibility Notice
> [!IMPORTANT]
> **OTA Is NOT Enabled in the Native APK**:
> An audit of `app.json` and `package.json` confirms:
> 1. `runtimeVersion` is **not configured** in `app.json`.
> 2. `updates` is **not configured** in `app.json`.
> 3. `expo-updates` is **not installed** in `package.json`.
>
> While no new native permissions or native modules were added since the last build on Nov 11 (`100f93a`), OTA updates cannot be delivered without `expo-updates` embedded in the native binary.
> **Therefore, an EAS build is required to ship these changes to end users.**

### Build Command (EAS Standalone APK / Bundle)
```bash
# Verify clean typecheck and lint
npx tsc --noEmit
npx expo lint

# Build standalone Android APK
bunx eas-cli build --platform android --profile production
```

### Mobile Verification
1. **Startup Console Log** (in Metro or Dev tools):
   ```text
   [HealthFreak App] Startup - PROMPT_VERSION: <short_sha>.<date>
   ```
2. **Profile Screen Footer**:
   - Open app -> Navigate to **Profile** tab.
   - Scroll to the bottom below the "Clinical Privacy Commitment" card.
   - Verify label: `HealthFreak v1.0.0 • Prompt: <short_sha>.<date>`.
3. **Client Chat Turn Log**:
   - Open Coach Mack chat screen -> Send message.
   - Check app log output:
     ```text
     [aiChatService] Hitting backend /api/voice/chat at: https://healthfreak-1.onrender.com Version: <short_sha>.<date>
     ```

### Rollback (Mobile App)
If an OTA update exhibits an unexpected client-side issue:
```bash
# Repoint channel to the previous update group ID
bunx eas-cli update:rollback --channel production
```
Or publish a quick revert OTA update from the previous known good commit.

---

## 6. Post-Deployment Smoke Test Checklist

- [ ] `GET https://healthfreak-1.onrender.com/health` returns HTTP 200 with matching `promptVersion`.
- [ ] `POST /api/voice/chat` returns HTTP 200 and includes `X-Prompt-Version`.
- [ ] Voice worker connects to LiveKit room and logs `PROMPT_VERSION`.
- [ ] Opening mobile app Profile screen displays the derived `PROMPT_VERSION`.
- [ ] Sending 3 test messages in Coach Mack chat shows varied openers and respects consecutive name gating.
- [ ] No synthetic `usr_synthetic_alex` data appears in responses for real authenticated users.

