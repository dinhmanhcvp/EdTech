# Smartboard Field Test Runbook

This is the repeatable setup for testing the real Teacher Board + Student App + AI Engine on a classroom LAN.

## 1. Network topology

Run the backend and both Next apps on one laptop/mini-PC connected to the same LAN as the smartboard and student devices.

```text
Smartboard browser ─┐
Student browser  ───┼── Wi-Fi/LAN ── host machine (LAN_IP)
                    │                 ├─ FastAPI :8000
                    │                 ├─ Teacher Board :3001
                    │                 └─ Student App :3002
```

Find the host LAN address with `ipconfig` on Windows. Do not use `127.0.0.1` in the browser-facing environment files.

## 2. Install and configure

From `socratic-monorepo/services/ai-engine`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `CORS_ORIGINS` in `.env` to the exact origins used by the two apps, for example:
`http://192.168.1.10:3001,http://192.168.1.10:3002`.
Add `GEMINI_API_KEY` only when online Gemini Vision is intended; deterministic engines and local fallbacks work without it.

Create `.env.local` in both Next apps from their `.env.example`, replacing `192.168.1.10` with the host LAN IP.

## 3. Start services

Terminal 1, from `services/ai-engine`:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Terminal 2, from `apps/teacher-board`:

```powershell
npx next dev -H 0.0.0.0 -p 3001
```

Terminal 3, from `apps/student-app`:

```powershell
npx next dev -H 0.0.0.0 -p 3002
```

Use production mode for a more realistic trial: run `npm run build` in the monorepo, then `npm run start -- -H 0.0.0.0` in each app.

## 4. Preflight from the host and the board

From the host, check `http://LAN_IP:8000/health`. The response must be HTTP 200. Confirm `runtime.rapidocr` and `runtime.chromadb` are true when the optional tiers are installed.

On the smartboard browser open `http://LAN_IP:3001`; on a student device open `http://LAN_IP:3002`. If either page cannot load, fix Windows Firewall inbound rules for TCP 3001, 3002, and 8000 before testing features.

## 5. Acceptance flow

1. On Teacher Board, create a classroom and verify the QR/code appears.
2. Join from one student device and confirm the roster count changes.
3. Draw a short formula, lasso it, and confirm a blueprint and simulation appear.
4. Move a simulation slider and confirm the student view receives the update.
5. Start a poll, vote from the student device, and confirm live percentages on the board.
6. Export Smart Notes, open Smart Notes on the student app, and verify the formula/parameters match.
7. Submit a correct and incorrect companion step; verify deterministic verification and visual debugger responses.
8. Disconnect Wi-Fi briefly, reconnect, and verify the classroom reconnects or shows a clear error.

Record the browser console, `/health` JSON, and backend logs for every failure. A green UI fallback is not evidence that the backend path succeeded; check the Network panel for the actual HTTP/WebSocket request.

## 6. Safety and reset

Use a test Gemini key only. Do not expose production keys in browser storage. Classroom/notes/heatmap state is currently process-local; restart the AI service between test sessions or call `POST /api/v1/classroom/reset` to clear demo data.
