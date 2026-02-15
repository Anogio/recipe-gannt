# Flow Recipe Frontend

Next.js 15 + TypeScript frontend for Flow Recipe.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Configuration

Frontend API target can be overridden with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

If not set, defaults are:
- development: `http://127.0.0.1:8000`
- production: `https://flow-recipe-api.anog.fr`

## Main Structure

- `src/app/page.tsx`: main app state and user flows
- `src/components/`: reusable UI blocks (search, checklist, graph, timers)
- `src/services/api.ts`: API client helpers
- `src/types/index.ts`: shared TypeScript interfaces
