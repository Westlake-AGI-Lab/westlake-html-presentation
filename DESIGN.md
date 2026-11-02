---
name: Xiaoxi student workspace
description: A calm editorial course library and local learning rehearsal.
colors:
  ground: "#f5f8f5"
  ink: "#1f3a33"
  primary: "#2f5d4e"
  accent: "#2f9e7e"
  muted: "#587066"
  border: "#dce6df"
  surface: "#fff"
  lavender: "#e9e4ee"
  lavender-ink: "#654c73"
  blue: "#e3ebf5"
  blue-ink: "#3c5b80"
  green: "#e1ede3"
  green-ink: "#385f47"
  sand: "#f3ebda"
  sand-ink: "#755a2e"
  caution-ink: "#805327"
  field-border: "#8da799"
  field-ground: "#fcfdfc"
  error: "#a12d2d"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(42px,4.2vw,60px)"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    lineHeight: 1.65
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 750
    letterSpacing: "0.13em"
rounded:
  control: "12px"
  inset: "14px"
  floating: "18px"
  card: "20px"
  dialog: "24px"
spacing:
  inline: "8px"
  compact: "12px"
  control: "16px"
  mobile: "20px"
  card: "24px"
  section: "28px"
  login: "36px"
  catalog-gutter: "40px"
  login-gutter: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "0 14px"
    height: "46px"
  login-input:
    backgroundColor: "{colors.field-ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
    height: "48px"
  filter-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "10px"
    padding: "8px 12px"
  navigation-current:
    backgroundColor: "{colors.green}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  course-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# Xiaoxi login and courses

## Overview
The student entry flow contains only fictional demo login and courses. Demo validation clears the inputs and navigates directly to courses.html. It is not authentication or access control.

## Colors
The pinned green palette and four pastel course tints in the frontmatter remain. Course metadata comes from existing browser-local study records; it is not mastery or completion scoring.

## Typography
Inter is embedded offline in courses.css. Bold headings use tight tracking, with tracked uppercase eyebrows and readable secondary text.

## Layout
Login retains its split introduction/form layout, floating course previews and arcs; it stacks on phones. Courses retain the sidebar, count/search/filter toolbar, responsive cards and lecture-selection dialog. Navigation exposes courses, My Progress, Discussions and demo login.

## Elevation & Depth
Preserve soft course-card shadows, the elevated login form and 12–24px rounded surfaces.

## Components
Keep Show/Hide password, inline validation, primary action, course filters and one keyboard action per course card. The intermediate workspace, SlideMate lab and integration previews were removed at the user's request. My Progress and Discussions are restored in course navigation.

## Do's and Don'ts
Preserve Westlake assets and the fictional Demo Student / DEMO2026 identity. Never save or send login values or imply official university sign-in. Preserve existing lecture content.

## Motion

The current contract uses --ease-out cubic-bezier(0.22,1,0.36,1), --dur-fast 180ms, --dur-base 300ms, --dur-slow 600ms and --stagger 70ms. CSS/WAAPI animate only transform and opacity. Existing login typography, fields and course layouts remain.

One orchestrated entry per screen. A reusable .reveal reads local --i. Login enters with 70ms spacing; later members shorten their 600ms duration so the entire group ends within 700ms. Course cards rise 12px over 300ms with 60ms stagger (delay capped at 400ms for the same budget). Navigation/sidebar/search never receive repeated motion. Filtering preserves card nodes and fades 150ms; it does not replay reveal classes. A single absolutely positioned filter background translates/scales into place. Focus rings and deeper hover shadows fade fixed overlays, avoiding animated color, border or box-shadow properties.

Tilted hero cards keep their static outer rotation. Nested layers separate one-time entrance from a ±6px, seven-second ease-in-out float with different phases. This is the only looping motion; it pauses in a hidden tab. The previously removed mascot, badge and autofill control remain absent. Existing sample values receive a 150ms fade. Errors use neutral text and a 200ms opacity response.

Primary press/arrow feedback is 180ms. Pointer hover is gated. Keyboard input finishes active transitions and responds instantly. Same-origin page navigation fades content for 150ms, then the next page fades in for 200ms. Nothing blocks reading or interaction during reveal. Reduced-motion mode disables all animation/transition and leaves content fully visible. will-change is used temporarily on active finite animations and cleared on finish/cancel; it is not applied permanently.

The local Inter face uses a short blocking font load from its embedded data, with fixed line boxes, footer boxes and count/list reservations to avoid fallback-font and asynchronous-catalog shifts. No remote font service or dependency was added.

## Editorial refinement

Course content leads: 128px desktop covers, 23px titles, 15px/1.6 descriptions, 24px card padding/gaps. Main frame uses a 224px sidebar and 32px content gutters; phone gutters are 20px. Phone navigation places Courses and demo sign-in on one row. Login uses a 60px maximum display, 28px form heading, 16px body/inputs and 50px controls. Card footers identify material provenance without repeating the study-record count. Brand colors, uppercase eyebrows and pastel covers are explicit user requirements.

Inspector review: login has zero failures. Courses inspector incorrectly computes active-filter contrast against the parent pale surface: the absolutely positioned dark #2F5D4E indicator is the actual background behind white text (7.4:1). Screenshots confirm placement at all three inspected widths. Large editorial headings and 11–12px secondary metadata are intentional brand exceptions; primary descriptions and controls were enlarged. No claim of an all-clear automated contrast audit is made.


Workspace sidebar geometry and order are shared across Courses, My Progress and Discussions. Sidebar navigation has no animation or fade.
