# React + Vite Checkout App

This is a React project bootstrapped with Vite and TypeScript.

**Tech stack**
- React
- Vite
- TypeScript
- React Router
- Tailwind CSS + shadcn-ui
- Stripe (Elements)
- Radix UI, TanStack Query

## Getting Started

Prerequisites:
- Node.js 18+ (Node 20.12.0 recommended)
- Yarn, npm, or pnpm installed

Install dependencies:
```sh
# Yarn
yarn install

# or npm
npm install

# or pnpm
pnpm install
```

Run the development server:
```sh
# Yarn
yarn dev

# or npm
npm run dev

# or pnpm
pnpm dev
```

Open `http://localhost:8080/` in your browser. The checkout route is:
```
/checkout/:dealId
```

## Scripts
```sh
# Start dev server
yarn dev

# Build for production
yarn build

# Build in development mode
yarn build:dev

# Preview a production build locally
yarn preview

# Lint the project
yarn lint
```

## Environment Variables
Create a `.env.local` (or `.env`) file and define any required keys. For Stripe:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Common steps:
```sh
yarn build
# Deploy the contents of the dist/ folder
```

If using Vercel, consult their Vite deployment guide or use the included `vercel.json` if present.
