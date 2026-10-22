# Golfbiljart situaties

Web app to draw, save and share golf billiards (golfbiljart) situations: a before-state (balls on the table), a shot (played ball + movements along paths, including scored balls), a derived after-state, an animated playback and a share link `/s/<slug>`.

## Stack

- Vite + Vue 3 + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`)
- vue-router, @supabase/supabase-js, nanoid
- Vitest for unit tests (`npm test`)
- Hosting: Netlify (builds from `main`, SPA redirect in `netlify.toml`)
- Database: Supabase (CLI installed as dev dependency: `npx supabase …`)
- No state management library, no component library. Extra dependencies need a one-sentence justification.

## Folder structure

```
src/
  table/        geometry.ts (table in mm, origin top-left of playing surface, portrait canonical), themes.ts
  domain/       types.ts, situation.ts (+ tests), paths.ts (+ tests), comment.ts (+ tests)
  components/   BilliardTable.vue, BallToken.vue, ShotPath.vue, ShotPlayer.vue, BallTray.vue, AppHeader.vue, GoalLegend.vue, LikeButton.vue, CommentsSection.vue
  composables/  useSituationEditor.ts, useEditTokens.ts, useAdmin.ts
  pages/        HomePage.vue, NewSituationPage.vue, SituationPage.vue, EditSituationPage.vue, MinePage.vue, AdminPage.vue, TablePreviewPage.vue
  lib/          supabase.ts, share.ts, slug.ts, situations.ts, likes.ts, liker.ts (+ tests), comments.ts
  router.ts
supabase/       migrations/
docs/           reference/ (table reference images), table-notes.md
scripts/        render-table.ts
```

## Conventions

- Work phase by phase (see status below). Never start the next phase before the current phase's verification gate is approved by the owner.
- One commit per phase, conventional commit message (`feat(table): …`).
- Ask when unsure, especially about dimensions and positions. Never guess geometry.
- UI text in Dutch (Flemish, informal "je"). Code, identifiers, commits and comments in English.
- Mobile first for the viewer (share links open on phones). Editor may be better on desktop but must work on touch.
- All geometry and logic (non-UI) gets unit tests with Vitest.
- Positions are stored in mm, never pixels.
- Test data always has the prefix `TEST_` in the title.
- Windows / PowerShell: use backslash paths in commands, no Unix-only shell constructs.

## Environment

`.env` (gitignored) holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`. The same variables are set on Netlify.

## Phase status

- [x] Phase 0 — Setup (folder, Git, GitHub, Netlify, Supabase)
- [x] Phase 1 — The table (geometry.ts, BilliardTable.vue, render check, `/tafel`)
- [x] Phase 2 — Editor: before-state (`/nieuw`)
- [x] Phase 3 — Editor: shot and after-state
- [x] Phase 4 — Playback (ShotPlayer.vue)
- [ ] Phase 5 — Save and share (Supabase schema, viewer, gallery, `/mijn`)
- [ ] Phase 6 — Deploy and polish (OG tags, favicon, README, TEST_ cleanup)

## Admin, likes and comments

- Admins are Supabase Auth users listed in `public.admins` (add with `insert into public.admins select id from auth.users where email = '…'`). Login at `/admin`. Public sign-ups are disabled in Supabase.
- Likes: one per device (random uuid in localStorage, `lib/liker.ts`); counters live on `situations.like_count` / `comment_count`.
- All browser writes go through security definer functions; admin functions check `is_admin()` and are not executable by `anon`.
