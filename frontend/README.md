# FST Pay — Frontend

React 19 + TypeScript 6 + Vite + Tailwind CSS.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start dev server (localhost:5173)
npm run build      # TypeScript check + production build
npm run test       # run 33 unit tests (Vitest)
npm run test:watch # watch mode
npm run lint       # ESLint
```

## Environment Variables

Create `.env` in this directory:

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

## Project Structure

```
src/
├── api/            # Axios instance + endpoint functions
├── components/     # Shared UI components
├── context/        # AuthContext, ThemeContext
├── features/       # Page components
│   ├── admin/
│   ├── ai-coach/
│   ├── analytics/
│   ├── auth/       # Login, Register
│   ├── cards/
│   ├── dashboard/
│   ├── rewards/
│   ├── settings/
│   ├── transactions/
│   └── wallet/
├── types/          # TypeScript interfaces
├── utils/          # Helper functions + tests
└── test/           # Test setup
```
