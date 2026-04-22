# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prominiapp is a plant disease detection system for cassava farmers, delivered as a LINE Mini App (LIFF). It consists of three independently-runnable services.

## Running the Services

All three services must run simultaneously for the full app to work.

**AI Service** (Python FastAPI, port 8000):
```bash
cd AI_SERVICE
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Backend** (Node.js Express, port 5000):
```bash
cd backend
node server.js
# or for hot-reload:
npx nodemon server.js
```

**LIFF Frontend** (React + Vite, port 5173):
```bash
cd frontend/frontend-liff
npm run dev
```

**Admin Frontend** (React + Vite, port 5174):
```bash
cd frontend/frontend-admin
npm run dev
```

**LIFF E2E Tests** (Cypress):
```bash
cd frontend/frontend-liff
npm run test:all      # starts dev server + opens Cypress
npm run cypress:open  # Cypress only
```

**Linting:**
```bash
npm run lint   # run from either frontend directory
```

## Architecture

### Service Interaction Flow

```
LINE App (user)
    └─► LIFF Frontend (5173) ──proxy /api──► Backend (5000)
                                                  └──► AI Service (8000)  [for /predict]
                                                  └──► PostgreSQL (5432)

Admin Panel (5174) ──proxy /api──► Backend (5000) ──► PostgreSQL
```

The Vite dev servers proxy `/api` and `/uploads` to `http://localhost:5000`. In production, ngrok is used to expose the local server to LINE.

### Authentication & Roles

The LIFF app authenticates entirely through LINE OAuth:
1. `initLiff()` in `frontend-liff/src/services/liffServices.js` calls `liff.init()`, then fetches the LINE profile.
2. The profile is sent to `POST /api/users/register` which upserts the user into PostgreSQL.
3. New users get `role = 'user'` (pending). An admin must promote them to `'Plant Pathologist'` via the admin panel before they can use the app.

Admin panel login (`POST /api/admin/login`) uses email + LINE `user_id` as the password — there is no separate password field; the `user_id` column doubles as the credential.

User roles: `user` (pending approval) | `Plant Pathologist` | `admin`

### Image / Prediction Flow

1. User uploads image → multer middleware saves it to `backend/uploads/` with a timestamped filename.
2. Frontend calls `POST /api/survey/predict` with `{ imagePath: "filename.jpg" }`.
3. `predictionController.js` reads the file from disk, streams it to the Python FastAPI `POST /predict` endpoint via `axios` + `form-data`.
4. FastAPI runs the ViT-B/16 model (`best_model_ViT16.pth`, 4 classes). If confidence < 80%, it returns `"another"` instead of a disease label.
5. Result is returned to the frontend and stored in `survey_images`.

The `backend/uploads/` folder is served as a static files at `/uploads` — that's how images are displayed in the frontend.

**Database Name:** `miniapp`

### Primary Schema (Survey Data)
- **users:** `user_id` (PK), `display_name`, `role`, `email`
- **plots:** `plot_id` (PK), `user_id` (FK), `plot_name`
- **survey_records:** `record_id` (PK), `plot_id` (FK), `survey_date`
- **survey_images:** `image_id` (PK), `record_id` (FK), `image_path`, `disease_name` (Expert Label), `ai_predicted_disease`, `confidence`, `created_at`

### Secondary Schema
- **adjacent_plants, weeds, herbicides:** Linked to `survey_records` via `record_id`.
- **prediction_logs:** Legacy table (avoid using for survey-based features).

### ⚠️ Crucial Rules for AI
- **Table Priority:** Use `survey_images` joined with `survey_records` for all log and history features.
- **Image Handling:** Use `image_path` (file references), NOT `image_base64`.
- **Expert vs AI:** `disease_name` is the Ground Truth from experts; `ai_predicted_disease` is from the model.
- **Sorting:** Always sort by `created_at DESC` or `survey_date DESC` by default.


### Frontend Structure

Both frontends are React 19 + Vite, using ES modules and functional components with hooks. State is held at the `App` level and passed as props — no global state library.

**frontend-liff**: User-facing LINE Mini App.
- `App.jsx` handles LIFF init, role gating (pending/approved), and bottom-nav routing.
- Pages: `HomePage` (plot list + survey history), `SurveyDetailPage` (create/edit plot + new record), `MapPage` (Leaflet map of all plots).
- Cypress testing bypasses LINE login by detecting `window.Cypress` and injecting a mock user with `role: 'admin'`.

**frontend-admin**: Admin panel (standard browser app, no LINE dependency).
- Auth state stored in `localStorage` as `adminToken`.
- Pages: `UserManagement` (promote/demote roles), `PlotManagement` (view all plots + surveys), `PredictionLogs` (AI history).

### Backend Structure

Node.js with ES Modules (`"type": "module"` in package.json). Express 5.

Pattern: `routes/` → `controllers/` → `config/database.js` (pg Pool).

All controllers respond with `{ success: boolean, data: ..., message: ... }`.

## Environment Variables

**backend/.env:**
```
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=miniapp
DB_PASSWORD=1234
DB_PORT=5432
```

**frontend/frontend-liff/.env:**
```
VITE_LIFF_ID=<LINE LIFF App ID>
VITE_API_URL=/api
```
