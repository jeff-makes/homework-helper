# Homework Helper

Homework Helper is a tiny collection of privacy-first, browser-based learning mini-games built with kids and families in mind. The first release ships with **Yeti Math: Everest**, a multiplication practice adventure that challenges players to “climb” Mount Everest one correct answer at a time.

## Why parents and teachers like it
- **Privacy-first:** The site does not collect or store any personal data. No accounts, no emails, no names—nothing.
- **No tracking:** There are no analytics scripts, pixels, or third-party trackers.
- **No cookies:** The app doesn’t set cookies.
- **Local-only scores:** Best scores and fastest times live only in the player’s browser (session/local storage). Clearing browser data resets progress.
- **Kid-safe by design:** Gameplay areas are free from ads, popups, or outbound links.
- **Open source:** The code is available so parents, guardians, and educators can inspect how everything works.

## Current games
| Route | Game | Description |
|-------|------|-------------|
| `/yeti-math` | Yeti Math: Everest | Practice 1–10 multiplication tables, manage supplies, and reach the summit with correct answers. |

The home page (`/`) links to every available game so new releases can be added quickly.

## Tech stack
- React + Vite + TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Deployed as a static site (Vercel works great — Framework = **Vite**, Build = `npm run build`, Output = `dist/`)

## Accessibility and UX
- Keyboard-friendly controls throughout gameplay and menus.
- Numeric input uses `inputMode="numeric"` for better mobile keypads.
- Clear toast and modal feedback for correct and incorrect answers.

## Local development
```bash
npm install
npm run dev
```

Visit the printed localhost URL (usually `http://localhost:5173`) to play the games while developing.

## Production build
```bash
npm run build
```

The production-ready static files land in the `dist/` folder.

## Contributing
Pull requests are welcome! Add new games under `src/pages/`, wire them up in the router inside `src/App.tsx`, and drop a link on the home page.
