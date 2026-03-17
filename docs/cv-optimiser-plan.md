# AI CV Optimiser — Implementation Plan

## Context
The CRM (product 1) is complete. Now building the second product: an **AI CV Optimiser** that candidates access via a unique link in their CRM welcome message. It captures structured candidate data (skills, domain, seniority, target roles) back into the CRM — making the lead database progressively richer with zero manual effort. Reference: `docs/product-proposal.html`.

**Two-step design:**
- **Step 1**: Upload CV → AI general optimization → profile data extracted to CRM
- **Step 2**: Paste JD → AI tailored rewrite + match score → intent data extracted to CRM

**Decisions:** Anthropic Claude for AI, token-linked URLs for access, local filesystem for file storage.

---

## 1. Schema Changes
**File:** `src/lib/db/schema.ts` — Add 7 columns to existing `candidateProfiles` table:

| Column | Type | Purpose |
|--------|------|---------|
| `cvToken` | text, unique | URL access token (CUID2) |
| `cvText` | text | Extracted raw text from uploaded PDF |
| `optimizedCvText` | text | Step 1 AI output |
| `jdText` | text | Pasted job description for step 2 |
| `tailoredCvText` | text | Step 2 AI output |
| `step1CompletedAt` | text | Timestamp |
| `step2CompletedAt` | text | Timestamp |

Then run `npx drizzle-kit push` to sync with Turso.

---

## 2. Install Dependencies
```
npm install @anthropic-ai/sdk pdf-parse
npm install -D @types/pdf-parse
```

Add `ANTHROPIC_API_KEY` to `.env`.

Update `next.config.ts`: add `serverExternalPackages: ["pdf-parse"]`.

---

## 3. Types
**File:** `src/types/index.ts` — Add:
- `CVOptimizeResult` — `{ optimizedCv, skills[], domain, seniority, suggestions[] }`
- `CVTailorResult` — `{ tailoredCv, matchScore, gaps[], strengths[], targetRoles[], industries[] }`

---

## 4. Token Generation + Message Engine Update

**File:** `src/app/api/leads/route.ts` (POST handler)
- After creating lead, generate `cvToken` via `createId()`, insert `candidateProfiles` row

**File:** `src/lib/message-engine.ts`
- Fetch candidate profile for the lead
- Change `cv_link` from static `CV_OPTIMISER_URL` to `${CV_OPTIMISER_URL}?token=${profile.cvToken}`

---

## 5. CV AI Service
**New file:** `src/lib/cv-ai.ts`

Two functions using `@anthropic-ai/sdk`:
- `analyzeAndOptimizeCV(cvText)` → Claude Sonnet, JSON-only system prompt, returns `CVOptimizeResult`
- `tailorCVToJD(optimizedCvText, jdText)` → Same pattern, returns `CVTailorResult`

Helper: `parseAIResponse<T>(text)` strips markdown fences before `JSON.parse`.

---

## 6. API Routes (4 new)

### `POST /api/cv/upload` — `src/app/api/cv/upload/route.ts`
- Accepts FormData (file + token)
- Validates token against `candidateProfiles.cvToken`
- Validates PDF type, max 5MB
- Saves to `public/uploads/cvs/{leadId}_{timestamp}.pdf`
- Extracts text via `pdf-parse`, validates min 50 chars
- Updates profile with `cvUrl` + `cvText`

### `POST /api/cv/optimize` — `src/app/api/cv/optimize/route.ts`
- Validates token, requires `cvText` to exist
- If already completed (`step1CompletedAt`), returns cached result
- Calls `analyzeAndOptimizeCV(cvText)`
- Updates profile: `optimizedCvText`, `skills`, `domain`, `seniority`, `step1CompletedAt`

### `POST /api/cv/tailor` — `src/app/api/cv/tailor/route.ts`
- Validates token, requires step 1 completed
- Calls `tailorCVToJD(optimizedCvText, jdText)` — builds on step 1 output
- Updates profile: `tailoredCvText`, `matchScore`, `targetRoles`, `industries`, `jdText`, `step2CompletedAt`

### `GET /api/cv/status` — `src/app/api/cv/status/route.ts`
- Validates token, returns current state (which steps completed, cached results, lead name for personalization)
- Enables page state restoration on refresh

---

## 7. Route Group Refactor (public vs CRM layouts)

The CV page must NOT have the CRM sidebar. Use Next.js route groups:

1. **Strip** `src/app/layout.tsx` to bare shell (html, body, fonts, globals.css, Toaster — no Sidebar)
2. **Create** `src/app/(crm)/layout.tsx` with Sidebar + main flex wrapper
3. **Move** all existing pages into `(crm)/`:
   - `page.tsx` → `(crm)/page.tsx`
   - `leads/` → `(crm)/leads/`
   - `pipeline/` → `(crm)/pipeline/`
   - `workflow/` → `(crm)/workflow/`
   - `templates/` → `(crm)/templates/`
   - `settings/` → `(crm)/settings/`
4. **Create** `src/app/(public)/layout.tsx` — minimal layout, no sidebar
5. **API routes stay at `src/app/api/`** — unaffected by route groups

URL paths don't change — `(crm)` and `(public)` are invisible in URLs.

---

## 8. Candidate-Facing CV Page
**New file:** `src/app/(public)/cv/page.tsx`

Standalone branded page (dark theme, no sidebar). Two-step wizard:

**Step 1 — Upload & Optimize:**
- On mount: `GET /api/cv/status?token=xxx` → restore state or show upload
- File input (PDF only, styled dropzone)
- Upload → `POST /api/cv/upload` → show extracted text preview
- Optimize → `POST /api/cv/optimize` → show optimized CV + skills badges + suggestions
- Copy/download buttons

**Step 2 — Tailor to JD** (unlocked after step 1):
- Textarea for pasting JD
- Tailor → `POST /api/cv/tailor` → show tailored CV + match score bar + gaps/strengths
- Copy/download buttons

UI uses existing shadcn components: Card, Button, Badge, Textarea, progress indicators.

---

## 9. CRM Lead Detail Integration

**File:** `src/app/api/leads/[id]/route.ts` (GET)
- Join `candidateProfiles` and include parsed profile data in response

**New component:** `src/components/leads/candidate-profile-card.tsx`
- Skills as Badge elements
- Domain + seniority text
- Match score with colored indicator
- Target roles + industries as badges
- CV download link
- Step completion status

**File:** `src/app/(crm)/leads/[id]/page.tsx`
- Render `CandidateProfileCard` when profile data exists

---

## Implementation Order

1. Schema changes + `drizzle-kit push`
2. Install deps (`@anthropic-ai/sdk`, `pdf-parse`) + env + next.config
3. Add types to `src/types/index.ts`
4. Route group refactor (move CRM pages to `(crm)/`, create `(public)/` layout)
5. Token generation in lead creation + message engine update
6. CV AI service (`src/lib/cv-ai.ts`)
7. API routes: upload, optimize, tailor, status
8. Candidate-facing CV page (`(public)/cv/page.tsx`)
9. CRM lead detail integration (profile card)
10. Build verification + manual test

---

## Verification
1. Create a lead → console shows welcome message with `?token=xxx` in cv_link
2. Open `/cv?token=xxx` → page loads, shows upload form
3. Upload a PDF → text extracted, preview shown
4. Click Optimize → AI processes → optimized CV displayed with skills/domain/seniority
5. Paste a JD → click Tailor → tailored CV + match score displayed
6. Refresh page → state restored from cache (no re-calling AI)
7. Open lead in CRM → candidate profile card shows extracted skills, domain, match score
8. Invalid/missing token → error state shown
9. All CRM pages still work at same URLs after route group refactor
10. `npm run build` passes clean
