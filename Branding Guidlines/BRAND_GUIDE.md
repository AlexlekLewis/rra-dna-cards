# Rajasthan Royals Academy — Brand Design Guidelines

> **Source of Truth** — All rules, colours, typography, logo usage, and templates extracted from the official RRA Design Guidelines PDF (2026 edition).

---

## 1. Design SOP (Standard Operating Procedure)

**All designs MUST be submitted for approval before use.**

| Contact | Email |
|---------|-------|
| Khyati Shah | Khyati.Shah@rajasthanroyals.com |
| Srnjayi Jain | srnjayi.jain@rajasthanroyals.com |

No brand asset (logo, tagline, war cry, etc.) may be used without prior written permission and must follow these guidelines to maintain consistency across all channels and collaterals.

---

## 2. Typography

### Brand Font: Montserrat

Montserrat is the **only** font permitted in all forms of communication — physical and digital. It has a full range of weights to support text hierarchy.

**Available weights:** Thin, Extra Light, Light, Regular, Italic, Medium, Medium Italic, Semi Bold, Bold, Extra Bold, Black

**Google Fonts source:** https://fonts.google.com/specimen/Montserrat

**Usage rules:**
- Use Montserrat for ALL design elements — headings, body text, captions, UI elements, print materials
- Leverage weight variations for hierarchy (e.g., Black for headlines, Regular for body, Light for captions)
- Never substitute with another font
- For web/digital: import via Google Fonts or self-host the .woff2/.ttf files

**CSS import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

font-family: 'Montserrat', sans-serif;
```

---

## 3. Colour Palette

### 3.1 Primary Colours

| Name | Pantone | HEX | RGB | CMYK | Usage |
|------|---------|-----|-----|------|-------|
| **Brand Pink** (Rhodamine Red) | Rhodamine Red C | `#E11F8F` | R: 229, G: 6, B: 149 | C: 5, M: 97, Y: 0, K: 0 | Primary pink — logos, accents, CTAs |
| **Brand Blue** (Admiral Blue) | Pantone 2736 C | `#1226AA` | R: 18, G: 38, B: 170 | C: 98, M: 92, Y: 0, K: 0 | Primary blue — text, headers, backgrounds |
| **Dark Navy** (Gradient only) | — | `#001D48` | R: 2, G: 29, B: 69 | C: 100, M: 80, Y: 20, K: 60 | Used ONLY for gradient backgrounds |

### 3.2 Secondary Colours

| Name | Pantone | HEX | RGB | CMYK | Usage |
|------|---------|-----|-----|------|-------|
| **Light Pink** | Pantone 218 C | `#E96BB0` | R: 233, G: 107, B: 176 | C: 4, M: 72, Y: 0, K: 0 | Softer pink accents |
| **Medium Blue** | Pantone 3005 C | `#0075C9` | R: 0, G: 117, B: 201 | C: 100, M: 46, Y: 0, K: 0 | Secondary blue accents |
| **Dark Charcoal** | Pantone 432 C | `#323E48` | R: 50, G: 62, B: 72 | C: 78, M: 64, Y: 52, K: 43 | Body text, neutral backgrounds |

### 3.3 Gradient Usage

The brand gradient is a **core design element** that adds dynamism and energy.

**Rules:**
- Gradient must spread **equally** from Brand Admiral Blue (`#1226AA`) to Brand Pink (`#E11F8F`) — or vice versa
- Use the **darker shade of navy** (`#001D48`) ONLY for gradient backgrounds, never as a standalone flat colour
- The gradient direction can vary (left-to-right, top-to-bottom, diagonal) depending on the creative

**CSS gradient:**
```css
/* Primary gradient (blue to pink) */
background: linear-gradient(135deg, #001D48 0%, #1226AA 40%, #E11F8F 100%);

/* Reverse gradient (pink to blue) */
background: linear-gradient(135deg, #E11F8F 0%, #1226AA 60%, #001D48 100%);
```

### 3.4 Colour Application Rules

| Material Type | Colour System |
|---------------|---------------|
| Stationery (business cards, envelopes, folders) | PANTONE |
| Digital / Web / Screen | RGB / HEX |
| Print materials (brochures, banners, posters) | CMYK |

---

## 4. Primary Brand Element — The Lion

The Lion is the primary brand graphic element (heraldic rampant lion with horn and chain).

### Permitted Lion Variants (ONLY these three):

1. **Brand Pink** — `#E11F8F` at 100% opacity
2. **White** — `#FFFFFF` (opacity can vary depending on creative context)
3. **White stroke/outline** — White outline only, opacity can vary

### Lion Usage Rules:
- The lion should NEVER appear in any other colour
- White lion opacity can be reduced for subtle background use
- The lion can be cropped/partially shown as a decorative element
- Maintain the original proportions — never stretch or distort
- Common placement: background watermark, accent element on gradient backgrounds

---

## 5. Logo System

### 5.1 Primary Logos

The RRA logo features the ornate "RR" monogram with crown, followed by "RAJASTHAN ROYALS ACADEMY" text stack.

**Three primary variants exist:**

| Variant | Background | Logo Colours | File |
|---------|-----------|--------------|------|
| Pink on White | White / Light | Pink `#E11F8F` monogram + Blue `#1226AA` text | `logos/rra-logo-pink-on-white.png` |
| Blue on White | White / Light | Blue `#1226AA` monogram + Blue text | `logos/rra-logo-blue-on-white.png` |
| White on Black | Black / Dark | White monogram + White text | `logos/rra-logo-white-on-black.png` |

### 5.2 Location-Specific Logos

Each academy location has its own logo variant with the location name below "ACADEMY". Each exists in a light (blue on white) and dark (white on black) version.

| Location | Light Version | Dark Version |
|----------|--------------|--------------|
| Jaipur | `logos/rra-jaipur-light.png` | `logos/rra-jaipur-dark.png` |
| London | `logos/rra-london-light.png` | `logos/rra-london-dark.png` |
| New Jersey | `logos/rra-new-jersey-light.png` | `logos/rra-new-jersey-dark.png` |
| Washington | `logos/rra-washington-light.png` | `logos/rra-washington-dark.png` |
| Melbourne | `logos/rra-melbourne-light.png` | `logos/rra-melbourne-dark.png` |
| Australia | `logos/rra-australia-light.png` | — |

**For Rajasthan Royals Academy Australia:** Use the **Australia** location logo for all Australian operations.

### 5.3 Logo Don'ts (CRITICAL)

These are **strictly prohibited:**

| ❌ Don't | Description |
|----------|-------------|
| Re-arrange elements | Do not move the crown, monogram, or text relative to each other |
| Re-size elements | Do not scale individual parts of the logo independently |
| Re-colour elements | Only use approved colour variants — no custom colours |
| Outline elements | Do not apply stroke/outline effects to the logo |
| Place in unapproved shapes | Do not put the logo inside circles, ovals, boxes, or other shapes not specified |
| Apply special effects | No drop shadows, glows, embossing, 3D effects, gradients on the logo |
| Rotate the logo | The logo must always appear upright |
| Distort or stretch | Maintain original proportions at all times |
| Overuse | Strategic placement only — don't plaster logos everywhere |
| Use without permission | All logo usage requires prior approval |

### 5.4 Logo Alongside Partners/Sponsors

When the RRA logo appears alongside other logos (sponsors, partners, venue):
- Ensure **proportional alignment** — all logos should be visually balanced
- Maintain adequate clear space around the RRA logo
- Never allow the RRA logo to be smaller than partner logos unless contractually required

---

## 6. Brand Taglines & War Cry

| Element | Text |
|---------|------|
| **War Cry / Tagline** | **HALLA BOL!** |
| **Motivational Line** | "FINDING A WAY TO WIN FROM ANYWHERE" |

- "HALLA BOL!" is displayed in a hand-drawn/brush script style, always in white
- The motivational line uses Montserrat, with "WIN" in Brand Pink italic

---

## 7. Templates & Collateral Specifications

### 7.1 Backdrop

| Property | Specification |
|----------|--------------|
| Size | 10W × 8H feet |
| Material | Star Flex Matt Finish or fabric printing |
| Logo | Change to location-specific logo |
| Design | Gradient background with player imagery and "FINDING A WAY TO WIN FROM ANYWHERE" headline |

### 7.2 Banner

| Property | Specification |
|----------|--------------|
| Size | 10W × 4H feet |
| Material | Follow backdrop material specs |
| Logo | Change to location-specific logo |
| Content | Imagery and text are indicative — change per context |

### 7.3 Net Branding

Two panel designs for indoor cricket net signage:
1. **Logo panel** — Gradient background (pink-to-blue) with centered RRA logo (white)
2. **HALLA BOL! panel** — Navy blue background with pink diagonal stripes, "HALLA BOL!" in white brush script

### 7.4 Feather Flags

| Property | Specification |
|----------|--------------|
| Material | Star Flex Matt Finish or fabric printing |
| Primary variation | Gradient background, RRA logo, "RAJASTHAN ROYALS ACADEMY" text, event date, lion watermark |
| Secondary variation | Reversed layout with gradient flowing opposite direction |
| Customisation | Logo per location, event date field, can include promotional content |

### 7.5 Stumps

- Branded with "RAJASTHAN ROYALS" text running vertically
- RRA logo at top and bottom
- Change logo per academy location

### 7.6 Certificates

| Property | Specification |
|----------|--------------|
| Paper | Art card, matt or gloss finish, 250–300 GSM |
| Title | "CERTIFICATE OF ACHIEVEMENT" in Brand Blue |
| Logo | Location-specific RRA logo (top center) |
| Fields | Name (Mr./Miss), participation details, category |
| Signatures | Kumar Sangakkara (Director of Cricket, RSG) — **DO NOT CHANGE**; Second signature modifiable per centre authority |

### 7.7 Standee

| Property | Specification |
|----------|--------------|
| Size | 3W × 6H feet |
| Material | Star Flex Matt Finish |
| Design | Gradient background with lion element, "HALLA BOL!" text, RRA logo at top |
| Logo | Change to location-specific logo |

### 7.8 Leaflet

| Property | Specification |
|----------|--------------|
| Size | A4 |
| Paper | 150 GSM, glossy paper |
| Layout | RRA logo in circular cutout (top right), imagery area, details section, contact footer |
| Logo | Change to location-specific logo |

### 7.9 PowerPoint Presentations

- Use the branded template with gradient backgrounds and lion watermarks
- Change logo per academy location
- Slide types: Title slide, Content + Image, Content + Pink sidebar, Heading bar + content, Thank You

### 7.10 Email Signature

```
[RRA Logo - Location specific]

NAME
DESIGNATION
────────────────────────
[Address]
M: [Phone] | W: www.rajasthanroyals.com
```

### 7.11 Stationery Suite

Includes branded: Letterhead, Business cards, Envelopes — all using the gradient + lion design language

---

## 8. Minimum Branding Requirements

Every academy event/location **must include** these branded elements:

1. ✅ Feather Flags
2. ✅ Net Branding
3. ✅ Standee
4. ✅ Backdrop
5. ✅ Stumps
6. ✅ Certificates
7. ✅ Perimeter Board
8. ✅ Logo Signage

---

## 9. File Reference

### Logo Files
All extracted logos are in the `logos/` directory — see Section 5 for the complete mapping.

### Raw Assets
All extracted images (backgrounds, brand elements, photos, templates) are in the `assets/` directory.

### Page Renders
Full-page renders of the original PDF are in the `page-renders/` directory for visual reference.

### Original PDF
The source document is preserved in `reference/RRA_Design_Guidelines_Original.pdf`.

---

## 10. Quick Reference Card

| Element | Value |
|---------|-------|
| Font | Montserrat (all weights) |
| Primary Pink | `#E11F8F` / Pantone Rhodamine Red C |
| Primary Blue | `#1226AA` / Pantone 2736 C |
| Dark Navy (gradient only) | `#001D48` |
| Secondary Pink | `#E96BB0` / Pantone 218 C |
| Secondary Blue | `#0075C9` / Pantone 3005 C |
| Dark Charcoal | `#323E48` / Pantone 432 C |
| War Cry | HALLA BOL! |
| Tagline | Finding a Way to WIN from Anywhere |
| Lion variants | Pink (#E11F8F), White, White stroke |
| Approval contacts | Khyati.Shah@ / srnjayi.jain@ rajasthanroyals.com |
