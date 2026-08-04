# Placement Prep Tracker

An all-in-one placement preparation platform: track applications, practice DSA, take AI-generated mock tests, run AI mock interviews, manage resume versions, and plan your learning roadmap.

## Features

### Dashboard
- Consolidated view of applications, practice progress, learning goals and reminders
- Charts and progress stats (Recharts)

### Application Tracker
- Track company, role, job type, status, apply/interview dates, links and notes
- Filter and manage the full application pipeline

### Coding Practice
- Log problems by platform, difficulty and status
- Built-in Monaco code editor with multi-language support
- Run code via the `run-code` edge function
- AI-generated DSA content and explanations (`generate-dsa-content`)

### Mock Tests
- AI-generated question sets by category, subcategory and difficulty (`generate-test`)
- Timed tests, scoring, answer review and history

### Mock Interviews
- AI interviewer with configurable type, target role and difficulty (`mock-interview`)
- Voice input via speech recognition and spoken questions via ElevenLabs text-to-speech (`text-to-speech`)
- Structured feedback and overall rating per session

### Resume Manager
- Multiple resume versions with version numbers, target role and change notes
- Private file storage for resume uploads (PDF/DOC/DOCX)
- Quality checklist: one page, ATS friendly, updated projects, updated skills
- AI Resume Analyzer: paste text or upload a PDF for an ATS score, strengths, improvements and recommendations (`analyze-resume`, `parse-resume-pdf`)

### Learning Goals
- Skills and topics with status, start/target dates, resource links and notes

### Roadmap
- Target role and company type, monthly goals, skill priorities and weakness tracking

### Reminders
- Custom reminders by type, toggleable active state

### Platform
- Email/password authentication with per-user profiles
- Row Level Security so every user only sees their own data
- Responsive layout, animated page transitions, light/dark theming, toasts and empty/loading states

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite 5 (SWC plugin)
- Tailwind CSS 3 + tailwindcss-animate + typography plugin
- shadcn/ui on Radix UI primitives
- Framer Motion (animations)
- React Router 6
- TanStack Query
- React Hook Form + Zod
- Recharts (charts), Lucide (icons), Sonner (toasts), date-fns
- Monaco Editor (`@monaco-editor/react`)
- react-markdown, next-themes

**Backend (Lovable Cloud)**
- Postgres database with Row Level Security
- Auth (email/password) with a `handle_new_user` trigger creating profiles
- Private storage bucket for resumes
- Deno edge functions: `analyze-resume`, `parse-resume-pdf`, `generate-dsa-content`, `generate-test`, `mock-interview`, `run-code`, `text-to-speech`

**AI**
- Lovable AI Gateway with Google Gemini models for analysis, question generation and interviews
- ElevenLabs for text-to-speech

**Tooling**
- Vitest + Testing Library + jsdom
- ESLint 9 + typescript-eslint

## Database Tables

`profiles`, `applications`, `coding_problems`, `mock_tests`, `mock_interviews`, `resumes`, `learning_goals`, `roadmap`, `reminders`

## Getting Started

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm run test`

## Deployment

Open the project in Lovable and click Share → Publish. Custom domains are configured under Project > Settings > Domains.
