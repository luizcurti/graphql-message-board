# Front-End — React + Apollo Client + GraphQL

React 18 application consuming the NestJS GraphQL API.

## 🚀 Technologies

- **React** v18 - UI Library
- **TypeScript** v4.9 - Type safety
- **Apollo Client** v3 - GraphQL client
- **React Router** v6 - Routing
- **Styled Components** v6 - CSS-in-JS styling
- **React Icons** v4 — Icon library

## 📦 Installation

\`\`\`bash
npm install
\`\`\`

## 🏃 Running the application

\`\`\`bash
# Development mode
npm start

# Production build
npm run build

# Run tests
npm test
\`\`\`

The application will be available at:
- **Frontend**: http://localhost:3000
- **GraphQL API**: Must be running at http://localhost:3333/graphql

## 🔧 Features

### Home Page (\`/\`)
- User login/registration with email
- Creates or authenticates user via GraphQL mutation
- Redirects to dashboard after authentication

### Dashboard (\`/dashboard\`)
- Displays paginated messages from the GraphQL API
- Create new messages via textarea form
- Delete own messages (with confirmation dialog)
- Highlights own messages visually
- Pagination controls with Prev/Next and page indicator
- Author email shown on each message

## 📁 Project Structure

\`\`\`
src/
├── pages/
│   ├── Home/        # Login / register page
│   └── Board/       # Message board with pagination
├── services/
│   └── api.ts       # Apollo Client configuration
├── styles/
│   └── global.ts    # Global styles
├── App.tsx          # Main app component
├── routes.tsx       # Route definitions
└── index.tsx        # Entry point (React 18 createRoot)
\`\`\`

## ✅ Build Status

| Item | Status |
|---|---|
| TypeScript | ✅ No errors |
| Build | ✅ Compiles successfully |
| Vulnerabilities | ✅ 9 low/moderate (dev dependencies only) |
| Board page | ✅ Create, delete own messages, pagination |
| Home page | ✅ Create/login user, redirect to dashboard |

## 🚀 Deployment

The build folder is ready to be deployed. You can use any static hosting service:

\`\`\`bash
# Build for production
npm run build

# Serve locally
npx serve -s build
\`\`\`

## 🔗 Backend Integration

This frontend connects to the NestJS GraphQL backend. Make sure the backend is running on port 3333 before starting the frontend.

See the \`back-end\` folder for backend setup instructions.
