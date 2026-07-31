# Design Brief — "Year-Round Reach" Upsell Screen (HAVEN Checkout)

**For:** Claude Design (design exploration — alternative directions and/or refinements)
**From:** HAVEN Lifestyles
**Status:** One polished direction exists (`/year-round`). We want fresh ideas — either genuinely different directions or sharp refinements to this one.

---

## 1. The one-paragraph context

HAVEN Lifestyles is a premium real-estate magazine (print + digital). Agents buy ad
placements. Our checkout app is a React/Vite/TypeScript SPA (shadcn + Tailwind, with a
hand-rolled design system in `checkout-redesign.css`). This is a **standalone upsell
screen** whose entire job is to convert a customer's **one-time invoice payment** into a
**monthly Annual Partnership subscription**. We've iterated one direction we like
("Year-Round Reach") and now want more ideas to compare against it.

## 2. What this screen has to do (the job)

- **Single focus.** No order summary, no multi-step chrome — the whole page is one offer.
- **Reframe the invoice as a smarter choice.** The customer is about to pay a one-time
  invoice (e.g. **$395** — one placement, in one issue, seen for ~6 weeks). We want to
  entice them to instead **switch to $195/mo** and run in **all 8 issues all year** — and
  today's charge simply becomes month one.
- **Feel premium and honest**, not a pushy dark-pattern upsell. Audience is professional
  real-estate agents; tone is editorial, confident, trustworthy.
- **Let them decline gracefully** ("Continue with single issue").

**Who sees it:** a named agent (we know their first name), mid-checkout, considering a
specific invoice amount. Copy is personalized ("Karen, …").

## 3. Current direction — `/year-round` (the baseline to build on / react to)

Route: `/year-round/:dealId` — component `src/pages/YearRoundReach.tsx`, styles under the
`.yr-*` block at the bottom of `src/components/checkout-redesign.css`.

Top → bottom (single centered column; full-bleed sticky footer):

1. **Slim top nav:** HAVEN wordmark (left) · "Issue {issue} · Checkout" (right).
2. **Serif headline**, two lines, tight tracking (-0.04em):
   "**Drop your payment to $195/mo.**" / "**Be in every issue.**"
3. **Centered body:** "{First}, switch your single placement to an annual partnership and
   your invoice today drops from $395 to $195/mo. Your full page runs in all 8 issues of
   HAVEN this year — refresh your print ad each issue, and make digital updates every
   month." + a bold kicker: "**Your clients see HAVEN all year. Make sure they see you.**"
4. **A light, underlined text toggle:** "See everything that's included ⌄" — **collapsed by
   default**. Opening it expands *in place* (pushing the magazines down) to reveal a
   **selectable two-column comparison**:
   - Left **"Pay the invoice" — $395 once** — dash bullets (one placement/one issue; ~6
     weeks; gone when the issue ships; rebook each time to keep running).
   - Right **"Annual Partnership / MAKE THE SWITCH" — $195/mo** — green-check bullets
     (guaranteed reservation, all 8 issues; refresh your creative every issue; print +
     digital, always on; 120,000+ readers across the year; priority placement + seller
     reports; locked-in pricing all year).
   - Cards are **transparent** (no fill, no shadow), thin borders, **table-row dividers**.
     Whichever card is **clicked takes the black highlight**; it **defaults to the annual
     (right) card**, and the "Make the switch" side stays pinned right.
5. **A fanned stack of 4 real HAVEN magazine covers** (glossy sheen, a page-thickness edge,
   and a wraparound shadow so the tops read as dimensional on first load).
6. **Sticky footer bar:** fine print bottom-left ("Lock in this rate today. Cancel anytime
   after 6 months. Pricing includes all production and proofs."), two buttons bottom-right:
   "Continue with single issue · $395 once" (ghost) and "Upgrade to annual — $195/mo" (black).

Everything ($195, $395, first name, issue, ~$820/yr savings) is pulled **live from the deal**.

> Treat this as **one strong direction — not the only answer.**

## 4. What we want from you

Produce **3–5 ideas**. A mix of:

- **Alternative directions** (different structure / emotional angle): e.g. comparison-as-hero
  (skip the expander), a "your year in HAVEN" timeline across the 8 issues, an ROI /
  cost-per-reader calculator, or an ultra-minimal one-image / one-CTA cut.
- **Refinements to the current screen:** the fanned-covers hero, the expander interaction,
  the comparison table, **first-load impact** (right now the magazines sit largely below the
  fold on landing — how do we make the hook land immediately?), and motion for the "switch"
  moment.
- **Mobile-first:** most agents open these on a phone — at least one concept designed phone-up.

For each concept, note: the core idea in one line, why it converts, and any tradeoffs.

## 5. Brand & design system (reuse this — don't reinvent)

Everything lives in `src/components/checkout-redesign.css`, scoped under `.hc-redesign`; this
screen's styles are the `.yr-*` rules at the end of that file.

**Type**
- Serif (headlines): **DM Serif Display** — `var(--hc-serif)`
- Sans (everything else): **DM Sans** — `var(--hc-sans)`
- (Proxima Nova files also ship in `/public/font` if a concept wants them.)

**Color tokens** (CSS custom properties; light "modern" theme values shown):
```
--hc-bg:          oklch(0.985 0.002 80)  /* page background, near-white */
--hc-paper:       #ffffff                /* cards (this screen uses transparent instead) */
--hc-ink:         oklch(0.20 0.005 60)   /* primary text / near-black */
--hc-ink-2:       oklch(0.46 0.005 60)   /* secondary text */
--hc-ink-3:       oklch(0.65 0.005 60)   /* tertiary / captions */
--hc-rule:        oklch(0.92 0.003 70)   /* hairline borders / dividers */
--hc-rule-2:      oklch(0.86 0.005 70)   /* stronger borders */
--hc-accent:      oklch(0.20 0.005 60)   /* accent (black in modern) */
--hc-accent-soft: oklch(0.96 0.005 70)   /* tinted fills */
--hc-positive:    oklch(0.55 0.10 150)   /* green — checkmarks / savings */
--hc-radius: 8px   --hc-radius-lg: 12px
```

**Themes** (set via `data-theme` on `.hc-redesign`): `modern` (default — minimalist
black-and-white; this screen uses it), `editorial` (warm cream + oxblood), `linen`
(soft/green), `noir` (dark mode + warm gold). Work in **modern** at minimum; theme-awareness
is a bonus. Exact per-theme token values are at the top of the CSS file.

**Reusable blocks already styled:** `.hc-btn` / `.hc-btn.lg` (buttons), `.hc-link-btn` (text
button), `.hc-badge` (pill), `.hc-topbar` / `.hc-wordmark` / `.hc-meta` (header),
`.hc-layout.solo` (centered single column). Prefer composing these.

## 6. Real data available per screen

Fetched from `GET {VITE_API_BASE_URL}/api/deals/:dealId` (Salesforce-backed):

| Field | Example | Use |
|---|---|---|
| `contact_first_name` / `name` | "Karen" / "Karen Schlegel" | personalization |
| `amount` / `formatted_price` | 395 / "395 USD" | the one-time invoice to beat |
| `currency` | "USD" | formatting |
| `issue` | "NE-070626" | which issue/market they're in |
| `mailing_address_city/state` | "Kennebunkport, ME" | local/regional framing |
| `add_ons[]` | Annual Partnership, Cover Wrap, Enhanced | source of the monthly price + art |

Business numbers to design around:
- **One-time invoice:** variable per deal (sample **$395** — one placement, one issue, ~6 weeks).
- **Annual Partnership monthly:** **Full Page $195/mo**, **Two-Page Spread $295/mo**.
- **Annual = 8 print issues/year**, ~**120,000+ readers/year**, continuous digital promotion,
  priority layout placement, refresh-your-creative-each-issue, seller distribution reports,
  locked-in pricing.
- **Savings framing:** ~**$820/year** vs. booking all 8 issues individually (8 × $395 − 12 × $195).
- Optional **pay-the-year-upfront** = `monthly × term − $100` discount.

## 7. Assets

- **4 real HAVEN covers** (used in the fan): `/checkout-redesign/assets/covers/mag-1…4.jpg`
  (portrait, 2303×2990).
- Wide "row of covers" hero: `/checkout-redesign/assets/annual-partnership.png`.
- Also: `/checkout-redesign/assets/enhanced-digital.jpg`, `cover-wrap.jpg`.
- Logos: `/logo-final.png` (wordmark in header), `/haven-logo-black.png`, `/public/logo-haven.svg`.

## 8. Technical constraints & how to preview

- Stack: React 18/19 + Vite + TypeScript + Tailwind + shadcn/ui; styles in one big scoped
  CSS file (`checkout-redesign.css`). **No CSS-in-JS.**
- Repo: `github.com/rrader101/havencustomercheckout`. `npm i`, then `npm run dev` →
  `http://localhost:8080`. Needs `.env.local` with
  `VITE_API_BASE_URL=https://pay.havenlifestyles.com`. Sample deal id: `006VL00000ZfEdyYAF`.
- **Three variants already exist to compare** (open each with the sample deal id):
  - `/checkout/:id?layout=bundle` — the original multi-step checkout (details → customize → pay)
  - `/switch/:id` — an earlier single-screen upsell with a Full-Page/Two-Page plan toggle
  - `/year-round/:id` — **the current direction described above**
- New concepts should be **additive** — new route/component (e.g. `/year-round-b/:dealId`) —
  so nothing else breaks and we can A/B side by side.
- Must be **responsive** (design mobile + desktop) and keyboard/screen-reader accessible
  (the selectable comparison cards are `role="button"` + keyboard; CTAs are real buttons).
- ⚠️ **Landmine:** `src/index.css` contains
  `.card, [class*="card"], .bg-card { border: 1px solid …!important }`. Any class whose name
  *contains the substring* "card" gets an unwanted forced border. **Avoid "card" in class
  names** (this screen uses `yr-compare-col` / `yr-compare-grid` for exactly this reason).

## 9. Guardrails

- **Honest framing only.** No fake urgency, no fake scarcity, no pre-checked hidden charges.
  The switch is a genuinely good deal — sell it on merit.
- Make the **decline path** easy and non-guilt-trippy.
- Keep it **fast** (no heavy libraries).

## 10. What to hand back

For each concept: a short rationale, a visual (a rendered React route in-repo is preferred,
or a static mockup), and notes on copy + motion. Rank them with a recommendation. We'll pick
a direction (or a hybrid) to productionize — which then needs the CTAs wired to create the
Stripe monthly subscription + update the deal (out of scope for the design pass).
