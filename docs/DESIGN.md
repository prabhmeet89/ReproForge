# DESIGN.md — ReproForge Design Direction

> **Note:** This file defines the design direction for ReproForge.
> Do NOT build any UI from this in Phase 0. This is for Phase 1.

---

## Design Philosophy

ReproForge should feel like a **premium developer tool** — clean, dark, and fast.
Think: Linear, Vercel Dashboard, or GitHub's dark mode. Not a toy project.

## Color Palette

- **Background**: Deep gray/black (`gray-950`, `gray-900`)
- **Surface/Cards**: Slightly lighter (`gray-800`, `gray-850`)
- **Primary accent**: Emerald green (`emerald-400`, `emerald-500`) — for success, CTAs
- **Secondary accent**: Blue/indigo for links and info
- **Error/Danger**: Red (`red-400`)
- **Warning**: Amber/yellow
- **Text**: White for headings, `gray-300` for body, `gray-500` for muted

## Typography

- Use **Inter** from Google Fonts (clean, modern, great for dashboards)
- Headings: Bold, tight tracking
- Body: Regular weight, comfortable line height
- Code blocks: **JetBrains Mono** or **Fira Code**

## Key UI Principles

1. **Dark mode first** — the entire app is dark themed
2. **Glassmorphism touches** — subtle glass effect on cards with `backdrop-blur`
3. **Smooth transitions** — all state changes should animate (200-300ms ease)
4. **Micro-interactions** — hover effects on cards, buttons scale slightly on press
5. **Status colors are meaningful** — green=reproduced, yellow=investigating, red=error, gray=pending
6. **Dense but readable** — pack info without feeling cluttered (like Linear)
7. **Responsive** — works on desktop (primary) and tablets (secondary)

## Component Style Guide

### Cards
- Rounded corners (`rounded-xl` or `rounded-2xl`)
- Subtle border (`border-gray-800`)
- Background slightly lighter than page
- Hover: slight scale + border color change

### Buttons
- Primary: Emerald gradient, white text
- Secondary: Gray with border
- Hover: Slight brightness increase + gentle shadow
- Active: Scale down slightly (0.98)

### Status Badges
- Pill-shaped (`rounded-full`)
- Color-coded background with matching text
- Small dot indicator before text

### Sidebar
- Fixed on left, collapsible
- Icon + text navigation items
- Active item has accent color background
- Smooth collapse animation

### Code Blocks
- Dark background (`gray-900` or `gray-950`)
- Syntax highlighting (use a library like Prism or Shiki)
- Copy button in top-right corner
- Line numbers
