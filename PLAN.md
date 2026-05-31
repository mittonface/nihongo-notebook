# Japanese Grammar Site — Plan

A personal, static study site for tracking Japanese grammar as you learn it. Built to be **fun to revisit**, **easy to add lessons to**, and **trivially hostable on GitHub Pages**.

---

## 1. Decisions locked in

| Area              | Choice                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Framework         | **Astro** with **MDX** for lessons                                     |
| Interactivity     | **Svelte** "islands" embedded in MDX                                   |
| Hosting           | GitHub Pages via GitHub Actions, served at **nihongo.mittn.ca**        |
| Audience          | Just you — personal tool, no onboarding, no SEO work                   |
| Level / source    | Beginner, mixed sources (Tae Kim, YouTube, etc.) — organize by topic   |
| Progress tracking | None — pure content + playgrounds                                      |
| Visual vibe       | Playful & colorful (think: friendly study notebook)                    |

### Interactive features (MVP)

1. **Furigana toggle** on every example sentence
2. **Conjugation playground** — type a verb/adjective, see all forms
3. **Sentence-builder quiz** — drag-and-drop scrambled words back into a sentence
4. **Audio playback** via browser TTS (`SpeechSynthesis` API, Japanese voice)
5. **Tagging system** — particles, verb forms, JLPT level
6. **Client-side search** across all lessons (Pagefind)

---

## 2. Tech stack rationale (short version)

- **Astro** ships zero JS by default and only hydrates the interactive bits — perfect for a content-heavy site that still wants playgrounds.
- **MDX** lets you write a lesson in markdown but drop in `<ConjugationTable verb="食べる" />` or `<SentenceQuiz id="..." />` wherever you want. This is the single most important authoring choice — it means each lesson can have *unique* interactivity without inventing a new schema each time.
- **Svelte** for islands: compact components, no virtual DOM, and the syntax stays clean inside MDX. Astro has first-class Svelte support via `@astrojs/svelte`. Drag-and-drop: [`svelte-dnd-action`](https://github.com/isaacHagoel/svelte-dnd-action) (the Svelte-native equivalent of dnd-kit).
- **Pagefind** generates a static search index at build time. No backend, works on GitHub Pages.
- **No database, no auth, no backend.** Anything that needs state lives in `localStorage` if at all — but MVP has none.

---

## 3. Repository layout

```
japanese-grammar/
├── astro.config.mjs
├── package.json
├── public/
│   └── audio/                  # (optional) pre-recorded audio overrides
├── src/
│   ├── components/
│   │   ├── Furigana.astro      # <Furigana kanji="食" reading="た" />
│   │   ├── Sentence.astro      # wraps a Japanese sentence: furigana toggle + TTS button
│   │   ├── ConjugationTable.svelte        # Svelte island
│   │   ├── ConjugationPlayground.svelte   # Svelte island
│   │   ├── SentenceQuiz.svelte            # Svelte island, drag-and-drop
│   │   ├── TagBadge.astro
│   │   └── Callout.astro       # tip / warning / note boxes for lessons
│   ├── content/
│   │   ├── config.ts           # Astro Content Collections schema
│   │   └── lessons/
│   │       ├── particle-wa-vs-ga.mdx
│   │       ├── te-form.mdx
│   │       └── ...
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── LessonLayout.astro
│   ├── lib/
│   │   ├── conjugate.ts        # verb/adj conjugation logic
│   │   ├── tts.ts              # SpeechSynthesis wrapper
│   │   └── tokenize.ts         # split sentences for quizzes
│   ├── pages/
│   │   ├── index.astro         # home: recent lessons + featured playgrounds
│   │   ├── lessons/
│   │   │   ├── index.astro     # all lessons, filterable by tag
│   │   │   └── [slug].astro    # renders a lesson
│   │   ├── tags/[tag].astro
│   │   ├── playground/
│   │   │   └── conjugation.astro
│   │   └── search.astro
│   └── styles/
│       └── global.css
└── .github/workflows/deploy.yml
```

### Content Collections schema (`src/content/config.ts`)

```ts
import { defineCollection, z } from 'astro:content';

const lessons = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1', 'unranked']).default('unranked'),
    tags: z.array(z.string()).default([]),  // e.g. ['particles', 'は', 'が']
    source: z.string().optional(),          // 'Tae Kim ch. 4', YouTube URL, etc.
    date: z.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons };
```

### Anatomy of a lesson file

```mdx
---
title: は vs が
summary: When to use the topic marker vs the subject marker.
level: N5
tags: [particles, は, が]
source: Tae Kim — Particles
date: 2026-06-01
---

import Sentence from '@/components/Sentence.astro';
import Callout from '@/components/Callout.astro';
import SentenceQuiz from '@/components/SentenceQuiz.svelte';

# は vs が

Use **は** to mark the topic ("as for…"), and **が** to mark the grammatical subject…

<Sentence jp="私[わたし]は学生[がくせい]です。" en="I am a student." />

<Callout type="tip">
  When answering a *who/what* question, use が. When introducing a topic, use は.
</Callout>

<SentenceQuiz
  client:visible
  answer={['私', 'は', '学生', 'です']}
  english="I am a student."
/>
```

> Furigana is encoded inline as `kanji[reading]`. A small parser in `<Sentence>` turns that into `<ruby>` tags, and a global toggle controls whether the readings are visible.

---

## 4. The interactive pieces

### 4a. Furigana toggle
- Inline syntax in lessons: `食[た]べる`
- `<Sentence>` parses it into `<ruby>食<rt>た</rt></ruby>べる`
- A header button flips a `data-furigana="on|off"` attribute on `<html>`; CSS shows/hides `<rt>` accordingly. Pure CSS, no React needed.

### 4b. Conjugation playground
- Standalone page at `/playground/conjugation`
- Covers, at launch: **verbs** (godan / ichidan / irregular), **い-adjectives**, **な-adjectives**, and the **copula** (`だ` / `です`).
- Input mode: type a word, optionally hint its type (verb-godan / verb-ichidan / verb-irregular / i-adj / na-adj / copula). A small dictionary of common stems can pre-fill the hint when the word is recognized.
- Output: a table of forms grouped by category:
  - **Polarity × tense**: affirmative / negative × non-past / past, both plain and polite
  - **Connective**: て-form
  - **Conditional**: ば / たら
  - **Modality (verbs only)**: 可能 / 受身 / 使役 / 意向 (volitional) / imperative
  - **Copula special cases**: `じゃない` vs `ではない`, `だった` vs `でした`
- Each cell has a TTS button.
- The logic lives in `src/lib/conjugate.ts` so lessons can embed targeted slices: `<ConjugationTable word="食べる" type="verb-ichidan" forms={['te', 'ta', 'nai']} />`.
- Edge cases handled explicitly (and unit-tested): `する` / `くる` / `いく`, `いい` → `よく`/`よかった`, copula `じゃ`/`では` variants.

### 4c. Sentence-builder quiz
- Svelte island using [`svelte-dnd-action`](https://github.com/isaacHagoel/svelte-dnd-action) (the Svelte-native dnd library; accessible, animated, ~7KB).
- Lesson author provides the correctly-ordered token array; the component shuffles it.
- User drags tiles into slots; on submit, correct tiles glow green, wrong tiles shake.
- On a fully correct answer: **confetti burst + soft chime** (see 4d for the chime).
- "Show answer" reveals the original sentence with furigana.

### 4d. Audio (TTS + UI chime)
- **TTS:** Web Speech API — `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` with `lang = 'ja-JP'`. Voice quality varies by OS; macOS Kyoko and iOS voices sound great.
- **Chime:** a short, pleasant tone played on correct quiz answers. Two ways to source it:
  1. A tiny royalty-free `.mp3`/`.ogg` in `public/audio/correct.mp3` played via `new Audio(...).play()`, or
  2. Synthesized at runtime with a few lines of Web Audio API (a soft sine-wave arpeggio) — zero asset weight, no licensing question.
- One wrapper in `src/lib/tts.ts` exposing `speak(jp)` and `chime()`, so every component can call either.

### 4e. Tagging & search
- Tags come straight from frontmatter. `/tags/は` lists every lesson tagged `は`.
- Pagefind runs as a post-build step (`pagefind --site dist`) and produces a static index in `dist/pagefind/`. The `/search` page loads it client-side.

---

## 5. Visual style: "playful & colorful"

- **Type:** A friendly rounded sans for UI (Nunito, Quicksand, or Plus Jakarta), and **Noto Sans JP** for Japanese text. Optional accent font for headings (e.g. Fredoka or Sniglet).
- **Palette:** I'll propose **2–3 concrete pastel palettes** when we hit the styling milestone, you pick one. Tentative starting point: soft pastels with one or two saturated accents — e.g. peach, mint, butter yellow, lavender, with a deep indigo for primary text. Each tag color is derived from the tag name (hash → HSL) so tags stay visually distinct without manual curation.
- **Shapes:** generous border-radius (12–20px), soft drop shadows, occasional hand-drawn SVG squiggles as section dividers.
- **Micro-interactions:**
  - Hover on a kanji → gentle bounce; click → TTS plays
  - Correct quiz answer → confetti burst (`canvas-confetti`)
  - Page transitions via Astro's built-in `<ViewTransitions />`
- **Layout:** single column, max ~720px for lesson body, but playgrounds get the full width.

---

## 6. Deployment to GitHub Pages (custom domain: nihongo.mittn.ca)

`.github/workflows/deploy.yml` (sketch):

```yaml
name: Deploy
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build              # astro build
      - run: npx pagefind --site dist   # generate search index
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Astro config:**
```js
// astro.config.mjs
export default defineConfig({
  site: 'https://nihongo.mittn.ca',
  // no `base` needed — custom domain serves at the root
  integrations: [mdx(), svelte()],
});
```

**Custom domain setup (one-time):**
1. Add a `public/CNAME` file containing exactly `nihongo.mittn.ca` — Astro copies it into `dist/` at build, and GitHub Pages reads it to bind the domain.
2. In your DNS provider (whoever runs `mittn.ca`), add a CNAME record: `nihongo` → `<github-user>.github.io`.
3. In GitHub repo Settings → Pages: set Source to "GitHub Actions", enter `nihongo.mittn.ca` as the custom domain, tick **Enforce HTTPS** once the cert provisions (usually within a few minutes).

---

## 7. Build order (suggested milestones)

**Milestone 1 — Skeleton (half a day)**
- `npm create astro@latest`, add MDX + React integrations
- Content collection + one sample lesson
- `BaseLayout`, `LessonLayout`, `/lessons` index
- Deploy to GitHub Pages and confirm the round-trip works

**Milestone 2 — Furigana + Audio (half a day)**
- `<Sentence>` component, inline `kanji[reading]` parser
- Header toggle for furigana on/off (CSS-driven)
- `tts.ts` + speaker button on every sentence

**Milestone 3 — Playful styling pass (half a day)**
- Pick palette + fonts, global CSS, callout components, tag badges
- View transitions, confetti, micro-interactions

**Milestone 4 — Conjugation playground (1–1.5 days)**
- `conjugate.ts` covering: verbs (godan / ichidan / irregular), い-adjectives, な-adjectives, and the copula (`だ` / `です`)
- Unit tests for the gnarly cases (`する`, `くる`, `いく`, `いい`, `じゃ`/`では`)
- `<ConjugationTable>` Svelte component (embeddable in lessons)
- Standalone `/playground/conjugation` page

**Milestone 5 — Sentence-builder quiz (1 day)**
- `<SentenceQuiz>` with `svelte-dnd-action`
- Shuffle, drop zones, validation, "show answer", confetti + chime on win

**Milestone 6 — Tags + Search (half a day)**
- `/tags/[tag]` page
- Pagefind wired into the build + `/search` page

**Milestone 7 — Write 3–5 real lessons**
- Pick the first few topics you're actively learning
- Use this round to find rough edges in the authoring experience and fix them

---

## 8. How adding a new lesson will feel

1. `touch src/content/lessons/new-topic.mdx`
2. Fill in frontmatter (title, tags, level, source, date)
3. Write prose in markdown, drop in `<Sentence>`, `<ConjugationTable>`, or `<SentenceQuiz>` wherever helpful
4. `git commit && git push` — GitHub Actions builds and deploys automatically

That's the whole loop. No registration of routes, no rebuilding navigation by hand — Astro's content collections and the `/lessons/[slug]` page handle it.

---

## 9. Things explicitly *out of scope* for v1

- User accounts, syncing across devices
- Server-side anything
- SRS / flashcards (can be added later as a separate module if you want it)
- Vocabulary lists, kanji writing practice — this site is about **grammar**
- Mobile app — but the site should be responsive and feel good on a phone

---

## 10. Resolved decisions

| Question                       | Decision                                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| Hosting URL                    | Custom domain: **nihongo.mittn.ca** (CNAME → `<user>.github.io`)    |
| Islands library                | **Svelte** (via `@astrojs/svelte`), drag-and-drop via `svelte-dnd-action` |
| Quiz feedback                  | **Confetti + soft chime** on correct answer                         |
| Color palette                  | I'll propose **2–3 pastel palettes** during Milestone 3; you pick   |
| Conjugation playground scope   | **Verbs + い-adj + な-adj + copula** at launch                      |

Nothing else outstanding — ready to start Milestone 1 whenever you are.
