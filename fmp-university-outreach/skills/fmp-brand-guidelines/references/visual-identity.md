# FMP Visual Identity Reference

Full visual specifications for Find My Place. Use this file whenever generating or auditing visual assets.

---

## Table of Contents
1. [Color System](#colors)
2. [Typography](#typography)
3. [Logo Rules](#logo)
4. [Illustration Guidelines](#illustration)
5. [Photography Guidelines](#photography)
6. [Brand Style Sliders](#style-sliders)
7. [Common Asset Types](#asset-types)

---

## 1. Color System {#colors}

### Brand Identity in One Sentence
FMP is a **light blue and white company**. The primary blue (#0980ff) is the hero color for bold graphic moments. White is the default canvas. Light blue (#d7f0ff) adds softness to graphic-heavy layouts. Dark blue (#134b95) is a supporting player only — not a primary surface or headline color.

### Full Color Scale (from Figma)

**Blue scale** — primary brand color family:
| Stop | Hex | AAA/AA contrast rating |
|------|-----|----------------------|
| 50 | `#edf9ff` | AAA |
| 100 | `#d7f0ff` | AAA |
| 200 | `#b0e6ff` | AAA |
| 300 | `#88d8ff` | AAA |
| 400 | `#50c1ff` | 2.02 (decorative only) |
| 500 | `#28a2ff` | 2.73 (decorative only) |
| **600** | **`#0980ff`** | **3.79 Large icon or text — primary brand blue** |
| 700 | `#0a6beb` | AA 4.87 |
| 800 | `#0f56be` | AA 6.79 |
| 900 | `#134b95` | AAA |
| 950 | `#112e5a` | AAA |

**Gray scale** — neutrals:
| Stop | Hex | Notes |
|------|-----|-------|
| 50 | `#f2f2f2` | Page bg alternative |
| 100 | `#e7e7e7` | Subtle dividers |
| 200 | `#d1d1d1` | Dividers, borders |
| 300 | `#b0b0b0` | Placeholder text |
| 400 | `#888888` | Secondary text |
| 500 | `#666666` | Body text alternative |
| 600 | `#505d5d` | — |
| 700 | `#4f4f4f` | — |
| 800 | `#454545` | — |
| 900 | `#343d3d` | — |
| 950 | `#262626` | Primary body text |

**Green scale** — accent only, use sparingly:
| Stop | Hex | Notes |
|------|-----|-------|
| 400 | `#a4cb43` | Primary green accent |
| 500 | `#80a233` | Darker green |
| 900+ | `#42521f` / `#222e0c` | Text on green backgrounds only |

### Color Roles — What Goes Where

| Color | Role | ✅ Use for | ❌ Never use for |
|-------|------|-----------|-----------------|
| White `#ffffff` | **Primary background** | Default canvas for all assets, cards, copy-heavy layouts | Text on light blue (fails contrast) |
| Light Blue `#d7f0ff` | **Soft background** | Graphic-heavy assets, section fills, chips/tags, social posts | Next to white (too similar — pick one) — never as text color |
| Blue `#0980ff` | **Hero / action color** | Header blocks, CTA buttons, icons, graphic accents | Body text, large text blocks, backgrounds behind small text |
| Dark Blue `#134b95` | **Contrast-only** | Text sitting on #0980ff blue bg, small icons on blue, subtle UI text | Primary backgrounds, section headers on white, large color fills |
| Black `#262626` | **Body text** | All body copy on white or light backgrounds | Light backgrounds where blue or dark blue would work better for brand feel |
| Gray `#d1d1d1` | **Dividers / secondary** | Borders, dividers, placeholder text, subtle elements | Text on white (fails AA contrast at 200 stop and lighter) |
| Green `#a4cb43` | **Rare accent** | Occasional highlight, badge, success state | Primary brand moments, backgrounds, large fills |

### Contrast Rules (from Figma color scale)

**Critical**: Blue #0980ff (600) only passes at **3.79 for large text and icons** — it does NOT pass AA for small body text. Use darker stops for readable text:
- Small text on white → use blue **700** (`#0a6beb`) minimum, prefer **800–900**
- Large headlines on white → blue **600** (`#0980ff`) is acceptable
- Any text on blue #0980ff background → use **white** only

**Light blue #d7f0ff (100 stop)** does NOT work next to white — they're too close in value. Always choose one or the other as the background. Never put them side by side as adjacent fills.

### Default Background Decision Tree

```
Is this copy-heavy (lots of text)?
  → White background (#ffffff)

Is this a graphic/social post or bold brand moment?
  → Blue (#0980ff) OR white — pick one dominant surface
  → Light blue (#d7f0ff) as accent fill only if background is white

Is this a card or module sitting on a white page?
  → Light blue (#d7f0ff) fill with black/dark text ✅
  → OR white fill with blue border/accent ✅
  → NOT light blue card on white bg with white text ❌
```

### Approved Pairings

| Background | Text | Accent / Icon | Notes |
|------------|------|---------------|-------|
| White `#ffffff` | Black `#262626` | Blue `#0980ff` | Default layout |
| White `#ffffff` | Black `#262626` | Dark Blue `#134b95` (small icons/links only) | Subtle UI |
| Blue `#0980ff` | White `#ffffff` | White or Light Blue `#d7f0ff` | Hero, CTA, bold moments |
| Light Blue `#d7f0ff` | Black `#262626` | Blue `#0980ff` | Soft cards, tags, chips |
| Light Blue `#d7f0ff` | Dark Blue `#134b95` (small text only, AAA) | — | Fine print on soft bg |

### ❌ Pairings to Never Use

- Light blue `#d7f0ff` background + white text (fails contrast completely)
- Light blue `#d7f0ff` next to white as adjacent fills (too similar, looks like a mistake)
- Dark blue `#134b95` as a full section background (too heavy — reserve for contrast use only)
- Blue `#0980ff` as body/paragraph text color (only passes for large text/icons)
- Any text color lighter than `#0a6beb` (700) on a white background

### Corner Radius Rule
**All square and rectangular elements must have rounded corners.** FMP has no sharp corners anywhere in the design system.
- Cards, buttons, chips, tags, modals, image frames: always use border-radius
- Minimum: 6–8px for small elements (chips, badges)
- Standard: 12–16px for cards, containers, image blocks
- Large: 20–24px for hero blocks, full-bleed sections with rounded bottoms
- Never use `border-radius: 0` on any visible container or graphic element

---

## 2. Typography {#typography}

### Typefaces

| Role | Font | Weight | Case |
|------|------|--------|------|
| Headlines | Poppins | Medium or Semibold | **Always lowercase** |
| Subheaders | Poppins | Medium | Title Case |
| Body copy | Raleway | Medium | Sentence case |
| Captions | Raleway | Medium | Sentence case |

### Critical Rule: Headlines Are Always Lowercase
This is non-negotiable and central to FMP's visual brand. "find your place" not "Find Your Place."

### Hierarchy Example
```
find your place (Poppins Semibold, lowercase — headline)
Start Your Search Today (Poppins Medium — subheader)
Browse verified listings from real landlords near your campus. (Raleway Medium — body)
Photo: BYU Campus, Provo UT (Raleway Medium — caption)
```

### Font Pairing Rules
- Never use more than 2 typefaces in a single asset (Poppins + Raleway)
- Poppins handles all display/headline work; Raleway handles all reading-level text
- Do not substitute other fonts

---

## 3. Logo Rules {#logo}

### Logo Variants

| Variant | When to use |
|---------|-------------|
| **Primary** (icon + "find my place" wordmark, stacked or horizontal) | Default — use this whenever possible |
| **Secondary** (wordmark alone OR icon alone) | When space or layout makes the primary mark impractical |
| **Tertiary** (icon + "fmp") | Limited space, brand recognition already established, casual/shorthand contexts |

### Critical Tertiary Rule
The "fmp" wordmark must **always** appear with the house icon. Never use "fmp" text alone.

### Whitespace Rule
Minimum whitespace around any logo = the size of the house icon in that logo. Do not crowd the logo.

### Logo Don'ts (any violation is off-brand)
- ❌ Rotate the logo
- ❌ Change logo colors (random colors, partial recoloring)
- ❌ Add a stroke or outline
- ❌ Change the font
- ❌ Stretch or distort proportions
- ❌ Place on backgrounds that violate contrast rules
- ❌ Use "fmp" text without the house icon

### Approved Color Versions
- Blue icon + dark wordmark (on white/light backgrounds)
- White icon + white wordmark (on blue/dark backgrounds)
- All-blue version (on white backgrounds, brand moments)
- All-dark version (on white backgrounds, subtle contexts)

---

## 4. Illustration Guidelines {#illustration}

### Style
- **Flat vector** — no 3D, no gradients, no drop shadows
- **Geometric shapes**: squares, rectangles, circles, triangles — with rounded corners
- **Simple, bold, clear** — communicates at a glance
- **Brand color palette only** — no off-palette colors

### What to avoid
- Excessive detail or shading
- Photorealistic elements mixed with flat illustration
- Colors outside the brand palette
- Complex or cluttered compositions

### Good illustration candidates for FMP
- Campus/building scenes (flat skyline style)
- Student lifestyle moments (simple geometric figures)
- Housing/apartment icons (keys, floorplans, door icons)
- Map/location concepts
- Phone/app UI representations

---

## 5. Photography Guidelines {#photography}

### Who to show
- College-aged students (18–25) and young adults (up to ~35 for grad/professional housing)
- Authentic, candid moments — not posed stock photo energy
- Diverse representation — this is a brand requirement, not optional
- **Never include children**

### What to show
- Studying, exploring campus, cooking, socializing in apartments
- Real living spaces — comfortable, relatable, not aspirational in a fake way
- Community moments — friends, roommates, shared spaces
- Both the people AND the spaces they inhabit

### Photo quality
- Bright, welcoming light
- Natural color grading — not heavily filtered
- Real environments, not sterile sets
- Candid > posed

### What to avoid
- Stock photo energy (too clean, too staged, too diverse-in-a-forced-way)
- Children
- Empty apartments with no people
- Dark, moody, or gritty aesthetics — FMP is warm and welcoming

---

## 6. Brand Style Sliders {#style-sliders}

From the official FMP Brand Guidelines PDF — these are the calibrated positions:

| Axis | FMP Position | Notes |
|------|-------------|-------|
| Casual ←→ Formal | ~25% toward formal (strongly casual) | Not fully casual — there's substance behind the friendliness |
| Warm ←→ Cold | Clearly warm | Heart behind the confidence |
| Direct & Practical ←→ Poetic & Fluffy | Moderate-direct | Gets to the point but not curt |
| Friendly ←→ Serious | Slightly toward serious | Friendly-first, but earns trust through credibility |
| Cautious ←→ Confident | ~80% confident | Decisive, takes positions, doesn't hedge |
| Soft & Kind ←→ Snarky | Centered, slight warmth | Wit, not snark; warmth, not softness |

---

## 7. Common Asset Types {#asset-types}

### Instagram Post (1080×1080)
- Blue (#0980ff) or white dominant background
- Poppins lowercase headline, large — the one thing people should read
- Minimal supporting text (Raleway)
- Strong single visual: illustration, photo, or text-dominant
- FMP logo in corner with whitespace
- Hashtags in caption, not on the image

### Instagram Story (1080×1920)
- Same color rules
- Single message, larger type — readable in 3 seconds
- CTA or swipe-up moment if applicable

### Email Banner (600px wide, variable height)
- White or light blue background preferred
- Poppins lowercase headline in blue or dark
- FMP logo top-left or top-center
- Clean, uncluttered — email clients render inconsistently

### Flyer / Event Poster (varies)
- Blue background with white text for high energy
- White background with blue headline for clean/informational
- Hierarchy: headline → what/when/where → CTA → logo
- Poppins headline, lowercase, large
- No more than 3 colors from the palette per asset

### Social Graphic (general)
- Single dominant message
- Brand color as background or strong accent
- Poppins headline, lowercase
- Logo always present with whitespace rule respected
