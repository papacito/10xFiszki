# 10xFiszki — AI Flashcards MVP

![Node.js](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5.x-BC52EE?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=0B0B0B)

An MVP for high‑school students to quickly generate high‑quality flashcards from notes using AI, then review them with spaced repetition. The goal is to reduce cognitive friction in flashcard creation, not to reinvent the repetition algorithm.

## Table of contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description

Students paste up to one page of notes, receive AI-generated flashcard proposals, and decide for each card whether to accept, edit, or reject it. Accepted cards are stored and scheduled using a proven SRS algorithm (e.g., SM‑2) without custom modifications.

Additional product requirements and user stories are documented in `./.ai/PRD.md`.

## Tech stack

Frontend:
- Astro 5 + React 19 for interactive UI
- TypeScript 5 for type safety
- Tailwind 4 for styling
- Shadcn/ui for accessible UI components

Backend:
- Supabase (PostgreSQL, authentication, and SDKs)

AI:
- Openrouter.ai for access to multiple model providers and cost limits

CI/CD and hosting:
- GitHub Actions for CI/CD pipelines
- DigitalOcean for Docker-based hosting

More detail is available in `./.ai/tech-stack.md`.

## Getting started locally

Prerequisites:
- Node.js `22.14.0` (from `.nvmrc`)
- npm

Steps:
1. Clone the repository:
```bash
git clone <your-repo-url>
cd 10xFiszki
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Available scripts

- `npm run dev` — start the dev server
- `npm run build` — build the production bundle
- `npm run preview` — preview the production build
- `npm run astro` — run the Astro CLI
- `npm run lint` — run ESLint
- `npm run lint:fix` — fix ESLint issues
- `npm run format` — format with Prettier

## Project scope

In scope (MVP):
- AI flashcard generation from pasted notes (up to one page)
- One‑card‑at‑a‑time review with explicit accept/edit/reject decisions
- Manual flashcard creation (front/back)
- Flashcard management (list, edit, delete)
- Required user accounts (for data storage and review history)
- Integration with a standard SRS algorithm (e.g., SM‑2)

Out of scope (MVP):
- Custom repetition algorithm
- PDF/DOCX/EPUB import
- Shared decks
- Mobile apps
- Gamification and advanced analytics

## Project status

MVP requirements and success metrics are defined in `./.ai/PRD.md`. Implementation status is not documented in the provided files.

## License

Not specified.
