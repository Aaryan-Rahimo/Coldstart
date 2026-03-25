# Coldstart — Frontend Design Document
**For:** Gemini (Next.js + React with Typescript + Tailwind implementation)
**Version:** 1.0

---

## 1. Project Summary

Coldstart is an AI-powered cold email platform for developers and students doing job/internship outreach. The UI should feel like a premium SaaS tool — confident, sharp, and built for people who move fast. Think "Linear meets Notion" energy, but warmer.

---

## 2. Design System

### Color Palette (Saturated)
Use these CSS variables throughout the entire application. These are slightly more saturated than the base palette.

```css
:root {
  /* Primary Brand Colors */
  --color-brand-deep:    #C13540;   /* darkest red — primary CTAs, active states */
  --color-brand-core:    #D94048;   /* core red — buttons, links, accents */
  --color-brand-mid:     #E05858;   /* mid coral — hover states, secondary buttons */
  --color-brand-soft:    #E87878;   /* soft coral — tags, badges, highlights */
  --color-brand-blush:   #F0A8A0;   /* blush — subtle backgrounds, illustrations */

  /* Neutrals (pair with the reds) */
  --color-bg:            #0F0D0D;   /* near-black warm background */
  --color-surface:       #1A1616;   /* card/panel surface */
  --color-surface-2:     #231E1E;   /* elevated surfaces */
  --color-border:        #2E2626;   /* subtle borders */
  --color-border-active: #C13540;   /* active/focused border */
  --color-text-primary:  #F5EFEF;   /* near-white warm */
  --color-text-secondary:#B09898;   /* muted text */
  --color-text-muted:    #6B5555;   /* very muted */

  /* Semantic */
  --color-success:       #4CAF7D;
  --color-warning:       #F0A830;
  --color-error:         #D94048;   /* reuse brand */
}
```

### Typography
```css
/* Import these fonts */
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&family=Geist:wght@300;400;500;600;700&display=swap');

--font-display:  'Instrument Serif', serif;      /* hero headlines, section titles */
--font-mono:     'DM Mono', monospace;           /* email text, code snippets, counts */
--font-body:     'Geist', sans-serif;            /* all UI text, labels, buttons */
```

### Spacing Scale
Use an 8px base grid: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.

### Border Radius
```
--radius-sm: 4px     (chips, badges)
--radius-md: 8px     (cards, inputs)
--radius-lg: 16px    (modals, panels)
--radius-xl: 24px    (hero sections)
--radius-full: 9999px (pills, avatars)
```

### Shadows
```css
--shadow-card:   0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--color-border);
--shadow-hover:  0 4px 20px rgba(193,53,64,0.25);
--shadow-glow:   0 0 40px rgba(193,53,64,0.15);
```

---

## 3. Pages

---

### 3.1 Hero / Landing Page (`/`)

**Goal:** Convert visitors to sign-ups. Communicate the value prop in under 5 seconds.

**Aesthetic:** Dark, confident, editorial. Think startup pitch deck meets developer tool. The red gradient creates warmth in an otherwise dark interface.

#### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  NAV: Logo left | Links center | CTA button right   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HERO: Two-column                                   │
│  Left: Headline + subtext + CTA buttons             │
│  Right: Animated app mockup / screenshot            │
│                                                     │
├─────────────────────────────────────────────────────┤
│  SOCIAL PROOF: "Built by developers, for developers"│
│  Logo strip (universities / companies)              │
├─────────────────────────────────────────────────────┤
│  FEATURES: 3-column card grid                       │
├─────────────────────────────────────────────────────┤
│  HOW IT WORKS: Numbered step flow                   │
├─────────────────────────────────────────────────────┤
│  CTA BANNER: Full-width gradient + sign up          │
├─────────────────────────────────────────────────────┤
│  FOOTER                                             │
└─────────────────────────────────────────────────────┘
```

#### Navbar
- Background: `transparent` → `var(--color-bg)` on scroll (with backdrop-filter blur)
- Logo: "Coldstart" in `font-display` with a small flame/bolt icon in `--color-brand-core`
- Nav links: "Features", "How it works", "Pricing" in `font-body` weight 400, `--color-text-secondary`
- CTA button: "Get Started Free" — filled button, `--color-brand-core` background, white text, `--radius-md`

#### Hero Section
- Full viewport height, vertically centered content
- **Background:** Dark base (`--color-bg`) with a radial gradient blob behind the right-side mockup: `radial-gradient(ellipse 600px 500px at 70% 50%, rgba(193,53,64,0.12), transparent)`
- A very subtle noise texture overlay (SVG filter or CSS `filter: url(#noise)`)

**Left column:**
- Eyebrow label: Small pill badge — `"AI-Powered Outreach"` in `font-mono`, `--color-brand-soft` text, `--color-brand-deep` border, `--radius-full`
- Headline (h1): Two lines in `font-display`, ~72px, `--color-text-primary`
  - Line 1: "Cold emails that"
  - Line 2 (italic): "*actually get replies.*" — in italic variant of Instrument Serif
- Subheadline: 18px `font-body` weight 300, `--color-text-secondary`, max-width 440px
  - "Upload your contacts, connect your GitHub, and let AI write hyper-personalized outreach emails for every single one."
- CTA buttons (horizontal stack):
  - Primary: "Start for free →" — `--color-brand-core` fill, white text, slight right-arrow, 48px height
  - Secondary: "See how it works" — transparent bg, `--color-text-secondary`, underline on hover
- Below CTAs: Small trust signal — `"✓ No credit card required  ✓ 100 emails free"` in `font-mono` 12px `--color-text-muted`

**Right column:**
- Floating "app window" mockup with:
  - Fake browser chrome in `--color-surface-2` (traffic light dots in red/yellow/green, URL bar showing "coldstart.app")
  - Inside: A table showing 3-4 fake contacts with generated email previews — columns: Company, Contact, Status (badge: "Draft" in blush, "Sent" in green)
  - Subtle entrance animation: fade-in + translateY from 20px, 0.6s ease, 0.3s delay
  - Hover: Slight lift with `--shadow-hover`

#### Features Section
- Section title: "Everything you need to land the interview" in `font-display` 48px, centered
- 3 cards in a grid:
  - **Card 1: "Upload & Parse"** — Icon: document with spark, Brand accent color
    - "Drop in a CSV of contacts and your resume. We handle the rest."
  - **Card 2: "AI Generation"** — Icon: sparkle/wand
    - "GPT-4o writes unique, contextual emails for every contact — referencing their company, your projects, and your background."
  - **Card 3: "Review & Send"** — Icon: send arrow
    - "Edit any draft, regenerate if needed, then send directly from your Gmail — all in one place."
- Card style: `--color-surface` bg, `--color-border` border, `--radius-lg`, hover lifts with `--shadow-hover`
- Card top: Thin gradient line accent `linear-gradient(90deg, var(--color-brand-deep), transparent)` — 2px tall, full width

#### How It Works (Numbered Steps)
- 4-step horizontal timeline (mobile: vertical)
- Step number in large `font-mono` `--color-brand-core` with very low opacity as background number (like "01", "02")
- Step title in `font-body` 600 weight
- Step description in `--color-text-secondary`
- Steps: Upload CSV → Upload Resume → Generate Emails → Review & Send

#### Final CTA Banner
- Full-width section with a gradient background: `linear-gradient(135deg, var(--color-brand-deep), var(--color-brand-mid))`
- Large centered headline: "Ready to start your outreach?" in `font-display` white
- Button: White background, `--color-brand-deep` text — "Create free account"

---

### 3.2 Login / Sign-Up Page (`/login`, `/signup`)

**Goal:** Fast, frictionless auth. Single focus — get the user in.

**Aesthetic:** Centered card on a dark background with a warm gradient accent. No distractions.

#### Layout
- Full viewport, vertically + horizontally centered
- Background: `--color-bg` with a large soft radial gradient: `radial-gradient(ellipse 800px 600px at center, rgba(193,53,64,0.08), transparent)`
- Optional: Very faint grid pattern background using CSS (1px lines at 24px intervals, 3% opacity)

#### Auth Card
- Size: 420px wide, auto height
- Background: `--color-surface`
- Border: `1px solid var(--color-border)`
- Border radius: `--radius-xl`
- Padding: 40px
- Shadow: `0 8px 40px rgba(0,0,0,0.5)`

**Card contents (top to bottom):**

1. **Logo** — "Coldstart" wordmark in `font-display` 28px, centered, `--color-text-primary`
   - Small decorative separator: thin gradient line 60px wide, centered, `--color-brand-core` to transparent

2. **Heading** — "Welcome back" (login) / "Start for free" (signup) — `font-body` 600 22px

3. **Google OAuth Button** (primary action):
   - Full width, 48px height, `--color-surface-2` background, `--color-border` border, `--radius-md`
   - Google "G" SVG logo + "Continue with Google" in `font-body` 500
   - Hover: border becomes `--color-brand-core`, slight bg lift

4. **Divider:** `— or continue with email —` centered, `--color-text-muted` 12px `font-mono`

5. **Email input:**
   - Full width, 44px height
   - Background: `--color-bg`, border: `--color-border`, `--radius-md`
   - Focus: border `--color-brand-core`, subtle red glow: `box-shadow: 0 0 0 3px rgba(193,53,64,0.2)`
   - Label floats up on focus/fill (floating label pattern)
   - Placeholder: `--color-text-muted`

6. **Password input** (same style as email + show/hide toggle)

7. **Submit button:**
   - Full width, 48px, `--color-brand-core` background
   - `font-body` 600, white text
   - Hover: `--color-brand-deep` (slightly darker)
   - Loading state: spinner replaces text, button disabled

8. **Toggle link:** "Don't have an account? Sign up" / "Already have an account? Log in"
   - `--color-text-secondary`, underline in `--color-brand-soft` on hover

**Micro-interactions:**
- Card entrance: fade-in + slight scale from 0.97 → 1, 400ms ease-out
- Input focus ring uses `transition: box-shadow 150ms ease`
- Button hover: `transition: background 150ms, transform 100ms` with slight translateY(-1px)

---

### 3.3 Main Application Page (`/app`)

**Goal:** The core working interface. Users see all their email drafts, can edit them, and trigger sends. Feels like a smart spreadsheet with superpowers.

**Aesthetic:** Dense but organized. Dark sidebar + light-ish content area — or fully dark if that fits better. Command-palette energy. Data-first.

#### Layout Structure

```
┌──────────┬──────────────────────────────────────────┐
│          │  TOP BAR: Page title + action buttons    │
│ SIDEBAR  ├──────────────────────────────────────────┤
│          │                                          │
│  (240px) │  MAIN CONTENT AREA                       │
│          │                                          │
│  Nav     │  Upload bar (if no data)                 │
│  links   │  OR                                      │
│          │  Emails data table                       │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
                          │
           [Email detail drawer opens from right]
```

#### Sidebar (240px, fixed)
- Background: `--color-surface`
- Right border: `1px solid var(--color-border)`
- Top: Logo + app name
- Navigation items (with icons):
  - 📬 Emails (default active)
  - 👥 Contacts
  - ⚙️ Settings
- Bottom: User avatar + email + sign out

- Active nav item: Left border 2px `--color-brand-core`, `--color-surface-2` background, `--color-text-primary`
- Inactive: `--color-text-muted`, hover: `--color-text-secondary`

#### Top Bar
- Height: 56px, `--color-surface` background, bottom border `--color-border`
- Left: Page title "Emails" in `font-body` 600 18px `--color-text-primary`
- Right (button group):
  - "Upload CSV" — ghost button with upload icon
  - "Upload Resume" — ghost button
  - "Generate Emails" — filled `--color-brand-core` button with sparkle icon ✨
  - "Send Selected" — secondary button, only enabled when rows are selected

Ghost button style: transparent bg, `--color-border` border, `--radius-md`, `--color-text-secondary` text. Hover: `--color-surface-2` bg.

#### Empty State (no data yet)
Center of content area shows:
- Large icon (envelope with sparkle)
- Headline: "Your outreach starts here"
- Subtext: "Upload a CSV of contacts to get started"
- Two action cards side by side:
  - "Upload CSV" card with drag-and-drop zone
  - "Upload Resume" card with file picker

Drag-and-drop zone: `--color-surface-2` background, `2px dashed var(--color-border)`, `--radius-lg`. On drag-over: border becomes `--color-brand-core`, bg becomes `rgba(193,53,64,0.05)`.

#### Emails Table
Full-width data table with:

**Columns:**
| Column | Width | Notes |
|---|---|---|
| ☐ Checkbox | 40px | Bulk select |
| Company | 180px | Company name |
| Contact | 200px | Email address |
| Role | 140px | Optional |
| Preview | flex | First 80 chars of generated email, truncated with ellipsis |
| Status | 100px | Badge: Draft (blush), Sent (green), Failed (red) |
| Actions | 120px | Edit, Regenerate, Send icons |

**Table styles:**
- Header row: `--color-surface-2` bg, `font-mono` 11px uppercase letter-spaced text, `--color-text-muted`
- Body rows: `--color-surface` bg, `--color-border` bottom border, 52px height
- Row hover: `--color-surface-2` bg transition 100ms
- Selected rows: `rgba(193,53,64,0.08)` bg + left border `2px solid var(--color-brand-core)`

**Status badges:**
- Draft: `--color-brand-blush` text, `rgba(240,168,160,0.15)` bg, `--radius-full`, `font-mono` 11px
- Sent: `#4CAF7D` text, `rgba(76,175,125,0.15)` bg
- Failed: `--color-brand-core` text, `rgba(217,64,72,0.15)` bg

**Action icons (per row, appear on hover):**
- ✏️ Edit (opens right drawer)
- 🔄 Regenerate
- ➤ Send (only if not sent)

#### Email Detail Drawer (right slide-in)
- Width: 480px
- Slides in from right on Edit click
- Background: `--color-surface`, left border `1px solid var(--color-border)`
- Top: Contact name + email + close button (×)
- Middle: Editable textarea showing full email text
  - Textarea: `--color-bg` background, `--color-border` border, `--radius-md`, `font-body` 14px, `--color-text-primary`, 300px min-height, resizable
  - Focus: same red glow ring as login inputs
- Bottom action bar:
  - "Regenerate" ghost button
  - "Save changes" ghost button  
  - "Send now →" filled `--color-brand-core` button

Drawer animations:
- Open: `transform: translateX(100%) → translateX(0)`, 280ms cubic-bezier(0.16,1,0.3,1)
- Close: reverse, 200ms ease-in
- Backdrop: `rgba(0,0,0,0.5)` fade-in behind drawer on mobile

#### Settings Page (`/app/settings`)
Tabs: "Profile", "Resume & Files", "GitHub", "Gmail", "Account"

**Gmail Connect section:**
- Show current connection status
- "Connect Gmail" button with Google icon
- When connected: show connected email + "Disconnect" link in muted red

**Resume & Files section:**
- List of uploaded files with type badge, filename, upload date
- Delete option
- Upload new file dropzone

---

## 4. Component Inventory

Build these as reusable components:

```
components/
├── ui/
│   ├── Button.tsx         (variant: primary | ghost | danger, size: sm | md | lg)
│   ├── Input.tsx          (floating label, error state, icon slot)
│   ├── Badge.tsx          (variant: draft | sent | failed | neutral)
│   ├── Card.tsx           (with optional gradient top border)
│   └── Drawer.tsx         (right-side slide panel with backdrop)
├── layout/
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── AppShell.tsx       (wraps sidebar + topbar + content)
├── emails/
│   ├── EmailTable.tsx
│   ├── EmailRow.tsx
│   ├── EmailDrawer.tsx    (edit + send panel)
│   └── EmptyState.tsx
└── upload/
    ├── CsvDropzone.tsx
    └── PdfDropzone.tsx
```

---

## 5. Animations & Motion

- **Page transitions:** Fade-in on route change (Next.js `AnimatePresence` or CSS)
- **Table rows:** Staggered fade-in when emails load (`animation-delay: calc(var(--row-index) * 30ms)`)
- **Button press:** `transform: scale(0.97)` on active, 80ms
- **Drawer:** Cubic-bezier spring entry (see above)
- **Loading skeleton:** Shimmer animation in `--color-surface-2` → `--color-border` gradient for table rows while generating
- **Generate button:** Pulse animation on the sparkle icon while generation is in progress

---

## 6. Responsive Behavior

- **Desktop (≥1200px):** Full sidebar + table layout as described
- **Tablet (768–1199px):** Sidebar collapses to icon-only (48px wide), drawer becomes full-height modal
- **Mobile (<768px):** Sidebar becomes bottom nav, table becomes card list view

---

## 7. API Integration Points

The frontend communicates with the FastAPI backend. All requests include `Authorization: Bearer {supabase_session_token}`.

```typescript
// Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL; // e.g., http://localhost:8000

// Key API calls the frontend makes:
POST   /files/upload-csv        → parse + store contacts
POST   /files/upload-pdf        → store + parse resume
POST   /emails/generate         → trigger AI generation
GET    /emails                  → fetch all email records
PATCH  /emails/:id              → save edits
POST   /emails/:id/regenerate   → regenerate single
POST   /emails/:id/send         → send via Gmail
DELETE /emails/:id              → delete draft
GET    /gmail/connect           → redirect to Google OAuth
```

State management: Use React Query (TanStack Query) for all server state. Optimistic updates for edits and status changes.

---

## 8. Key UX Flows

### Flow 1: First-Time User
1. Land on `/` → click "Get Started Free"
2. `/signup` → Google OAuth → redirect to `/app`
3. Empty state shown with upload prompts
4. User uploads CSV + resume
5. Clicks "Generate Emails" → loading skeleton in table
6. Emails appear row by row as they generate
7. User clicks a row → drawer opens → reads email → clicks "Send now"

### Flow 2: Returning User
1. `/login` → straight to `/app`
2. Table shows all existing drafts
3. User selects checkboxes → "Send Selected" → bulk send

### Flow 3: Edit + Regenerate
1. Click row → drawer opens
2. Edit text manually → "Save changes"
3. OR click "Regenerate" → spinner → new text appears in textarea

---

## 9. Implementation Notes for Gemini

1. **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
2. **Auth:** `@supabase/ssr` for server-side session management
3. **State:** TanStack Query v5 for all server state, Zustand for UI state (drawer open/close, selected rows)
4. **Forms:** React Hook Form + Zod validation
5. **File uploads:** Use `react-dropzone` for CSV and PDF upload zones
6. **Icons:** `lucide-react` for all UI icons
7. **Table:** Build custom (do not use a heavy table library) — the table is simple enough
8. **Fonts:** Load via `next/font/google`
9. **Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
10. Apply the CSS variables in `globals.css` under `:root` — use `dark` class on `<html>` by default since this is a dark-first app
