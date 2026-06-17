# Design Book

Swipe through thousands of jersey mockups with a teammate. A like from either Ryan or Jackson keeps the design. Curated keepers live in the Library with bulk ZIP download.

## Stack

- Next.js (App Router) on Vercel
- Supabase Postgres + Realtime
- Framer Motion swipe UI

## Setup

1. **Environment variables** — copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set these from your Supabase project (Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional; used for import and download if set)

2. **Database** — apply the migration in [`supabase/migrations/`](supabase/migrations/) to your Supabase project, or run locally:

```bash
npm run db:start   # requires Docker
npm run db:reset
```

3. **Import mockups** (one time):

```bash
npm run import
```

4. **Run locally**:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick Ryan or Jackson, and start swiping.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Add the same env vars in Vercel project settings.
4. Deploy.

## Usage

- **Swipe** — shared queue; when one person votes, the card disappears for both (Realtime sync). Arrow keys or buttons: left = archive, right = keep.
- **Library** — all keepers, filter by who liked them, preview full size, download filtered set as ZIP of original images.

## Data

Mockups are imported from `c7dbeb.Design Versions - O7.csv` (~10,754 unique URLs after deduping). Votes are one-per-mockup; first swipe wins if both people reach the same card at once.
