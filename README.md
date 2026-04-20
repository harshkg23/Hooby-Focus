# Hobby Focus

Hobby Focus is a curated hobby-learning web app that helps users improve one hobby at a time without information overload.

Instead of dumping a huge content library, the app generates a short, intentional plan (5–8 techniques), tracks progress, and lets users learn each technique through:

- **Video** (curated YouTube results)
- **Read** (short structured AI explanation)
- **Listen** (browser text-to-speech from generated content)

It also includes authentication, protected dashboard access, and support for **multiple saved learning paths** per user.

---

## Product Goals

- Keep learning focused and non-overwhelming.
- Prioritize completion over endless browsing.
- Make progress visible and motivating.
- Deliver a premium, minimal UI on desktop and mobile.
- Use AI for narrowing and structuring content, not bloating it.

---

## Core Features

### 1) Authentication & Protected Dashboard
- Sign up, log in, log out.
- JWT-based auth with secure httpOnly cookie.
- `/dashboard` is protected via Next.js middleware.

### 2) Curated Learning Plan Generation
- User inputs: hobby, level, optional goal.
- AI returns a focused 5–8 technique roadmap.
- Each technique includes card hint, summary, and YouTube query terms.

### 3) Multiple Saved Paths + Resume
- Users can create multiple paths (e.g., Chess, Guitar, Poker).
- Left sidebar (`My paths`) allows:
  - switching/resuming any path,
  - adding another path while keeping existing ones,
  - removing specific paths.
- Each path keeps independent progress.

### 4) Technique Learning Modes
- **Video:** small, curated YouTube list (not content dump).
- **Read:** concise AI-generated definition/steps/mistakes/tips.
- **Listen:** browser speech synthesis for reading or short AI narration script.

### 5) Progress Tracking
- Technique status options: `active`, `complete`, `skipped`, `revisit`.
- Overall progress percentage shown per path.
- Progress persists locally and is restored after refresh.

### 6) Caching
- Optional MongoDB-backed cache for:
  - learning plans,
  - technique content,
  - YouTube results.
- Reduces API calls and improves responsiveness.

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand + localStorage persistence
- **Auth:** JWT (`jose`) + bcrypt password hashing (`bcryptjs`)
- **Database:** MongoDB
- **AI:** Google Gemini API (`@google/generative-ai`)
- **Video Source:** YouTube Data API v3
- **Tests:** Vitest

---

## Architecture Overview

### Frontend
- Landing page, login/signup pages, protected dashboard.
- Reusable UI components for:
  - plan creation form,
  - progress header,
  - technique cards,
  - technique learning sheet/modal,
  - paths sidebar.

### Backend (Next.js Route Handlers)
- Auth routes (`/api/auth/*`)
- Learning plan route (`/api/learning-plan`)
- Technique content route (`/api/technique-content`)
- YouTube search route (`/api/youtube/search`)

### Services
- `gemini.ts` for AI plan/content generation.
- `youtube.ts` for constrained YouTube search.
- `cache.ts` + `mongodb.ts` for optional caching.
- `users.ts` for account persistence.

### Client Store
- Multi-path learning state with active-path selection.
- Legacy single-path storage migration to current shape.
- User-bound persistence reset when account changes.

---

## Folder Structure

```text
hobby/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── learning-plan/route.ts
│   │   │   ├── technique-content/route.ts
│   │   │   └── youtube/search/route.ts
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── landing/
│   │   └── layout/
│   ├── hooks/
│   ├── lib/
│   │   ├── auth/
│   │   ├── types/
│   │   └── env.ts
│   ├── services/
│   ├── store/
│   └── utils/
├── middleware.ts
├── .env.example
└── README.md
```

---

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required/optional keys:

- `YOUTUBE_API_KEY`  
  YouTube Data API v3 key (server-side only).

- `GEMINI_API_KEY` or `Gemini_API_KEY`  
  Gemini API key (server-side only).

- `GEMINI_MODEL` *(optional)*  
  Force a specific Gemini model if needed.

- `MONGODB_URL`  
  MongoDB connection string.
  - Used for user accounts.
  - Also used for optional response caching.

- `JWT_SECRET`  
  Secret for signing auth tokens (minimum 16 chars, use strong random value).

> Never commit `.env` to git.

---

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Start dev server

```bash
npm run dev
```

Open:

- Landing page: [http://localhost:3000](http://localhost:3000)
- Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run test` | Run Vitest suite |
| `npm run test:watch` | Run Vitest in watch mode |

---

## API Routes

### Auth
- `POST /api/auth/register` - create user, set cookie.
- `POST /api/auth/login` - verify credentials, set cookie.
- `POST /api/auth/logout` - clear cookie.
- `GET /api/auth/me` - return current session user.

### Learning
- `POST /api/learning-plan`
  - Input: hobby, level, goal
  - Output: curated plan (5–8 techniques)

- `POST /api/technique-content`
  - Input: hobby, level, technique title/summary
  - Output: definition, steps, mistakes, tips, narration script

- `GET /api/youtube/search?q=...`
  - Output: small list of curated YouTube videos

---

## Data Model Notes

### User (`users` collection)
- `email`
- `name`
- `passwordHash`
- `createdAt`

### Cache (`cache` collection)
- key-based JSON cache for AI/YouTube responses
- includes expiry metadata

### Client Learning Store
- `paths[]`: list of saved learning paths
- `activePathId`: currently opened path
- each path contains:
  - `plan`
  - `progress` map keyed by `techniqueId`

---

## Gemini Model Handling

The app does not rely on a single hard-coded model.

Behavior:
1. Lists available models from the API key context.
2. Filters models supporting `generateContent`.
3. Tries preferred models first.
4. Falls back safely (schema JSON mode, then JSON mode).
5. Supports manual override via `GEMINI_MODEL`.

This avoids frequent `404 model not found` issues across API versions/projects.

---

## UX System

- Dark, aesthetic visual identity with gradient orbs and glass surfaces.
- Responsive layout across desktop and mobile.
- Sidebar-driven path management in dashboard.
- Strong visual hierarchy:
  - path context,
  - progress,
  - actionable technique cards,
  - focused modal learning modes.

---

## Security Notes

- API keys and JWT secret are read only on server.
- Do not expose secrets with `NEXT_PUBLIC_*`.
- Passwords are hashed with bcrypt before storage.
- Auth token is in httpOnly cookie (not accessible to client JS).
- Middleware protects dashboard routes.

---

## Testing

Current tests include:
- progress utility behavior
- learning plan shape contract

Run:

```bash
npm run test
```

---

## Troubleshooting

### `JWT_SECRET is missing or too short`
- Add `JWT_SECRET` in `.env` (16+ chars), restart dev server.

### `Module not found: Can't resolve 'jose'`
- Run `npm install` again.

### Gemini model 404 errors
- Ensure API key has Gemini access.
- Set `GEMINI_MODEL` to a known available model for your account.
- Verify billing/API enablement in Google AI Studio/Cloud.

### No videos returned
- Check `YOUTUBE_API_KEY` and quota in Google Cloud Console.

### Mongo errors
- Verify `MONGODB_URL` and network/db access.

---

## Roadmap Ideas

- Server-side persistence of path progress (cross-device sync).
- Better analytics (streaks, consistency insights).
- Optional reminders/calendar nudges.
- Better content quality scoring for YouTube curation.
- Expanded tests for auth and API routes.

---

## License

Add your preferred license (MIT, Apache-2.0, etc.) in a `LICENSE` file if you plan to distribute this project.
