# Authentication UI Research & Accessibility Notes

## 1. Patterns Observed (Linear, Supabase, GitHub & WCAG 2.2)
- **Split-screen layout (Desktop)**: Left side hosts brand trust + product preview/terminal proof; right side holds a focused 380-440px form card.
- **Mobile/Tablet**: Gracefully collapses to single column with prominent logo header and full-width card; complex side graphic is omitted.
- **Form Ergonomics**: Explicit labels above fields (never placeholder-only), explicit `autocomplete` tokens (`username`/`email`, `current-password`, `new-password`), and zero blocking of `paste` events for password manager compatibility (WCAG 2.2 SC 3.3.8).
- **Error Feedback**: Combination of field border + icon + text tied with `aria-describedby` and `aria-invalid="true"`, plus immediate focus shift to the first invalid field or top banner upon failed submit.
- **Micro-interactions**: One subtle horizontal shake on validation failure (300ms), soft emerald focus ring glow, and CapsLock status warning on password fields.
- **Accessibility & Motion**: Respect `prefers-reduced-motion` strictly by disabling gradient sweep rotations, typing loop intervals, and aurora drift, presenting static high-contrast frames instead.

## 2. Ideas We Adopt
- Dedicated desktop split panel with live terminal-style reproduction demo clearly labeled with visible `DEMO` badge.
- Fluid aurora ambient background (GPU-only `transform` loops) with faint grid mask.
- Caps Lock detection via `event.getModifierState("CapsLock")`.
- Show/hide password button with explicit `aria-label` and `aria-pressed`.
- Single horizontal shake animation on submit error and focus jump to offending input.
- Cross-fade/slide transitions between `/login` and `/signup` without unmounting the outer shell.

## 3. Ideas Skipped & Why
- **OAuth / Social Logins (GitHub, Google, Vercel)**: Skipped because the backend only supports argon2id server-side email/password sessions. No fake buttons.
- **Forgot Password / Remember Me**: Skipped because password reset and long-lived remember tokens do not exist in the backend schema.
- **Heavy Canvas / WebGL Particle Meshes**: Skipped to maintain high frame rates, low battery usage, and zero extra dependencies.
