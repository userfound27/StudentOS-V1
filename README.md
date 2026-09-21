# StudentOS

StudentOS is a colorful, practical personal operating system for school.

## Current build

- Dashboard with today's priority, study progress, score average and upcoming exams
- Study sessions with completion tracking
- Exam tracker with portion/preparation progress
- Score tracker
- 25-minute Pomodoro focus timer
- Custom journey objective
- Responsive desktop/mobile navigation
- Anonymous session mode: app data lives in React memory and is cleared on refresh
- No paid APIs, paid component libraries, or subscription-only features in the core app

## Free-first architecture

The frontend is React + TypeScript + Vite and uses open-source packages. Persistent accounts will be implemented behind a free-tier backend adapter so the anonymous experience never depends on a paid service.

Google/Microsoft OAuth and persistent cloud storage require the project's own provider configuration. No secret keys are committed to this repository.

## Run locally

```bash
npm install
npm run dev
```

## Product rules

1. No fake buttons or fake data-saving claims.
2. Anonymous mode must not persist user data.
3. Account mode must migrate the anonymous session into the authenticated account.
4. Avoid paid dependencies and paid APIs.
5. Keep the UI fast, colorful and student-focused.
