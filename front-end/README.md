# Front-End - React + Apollo Client + GraphQL

React application with Apollo Client for consuming the GraphQL API.

## 🚀 Technologies

- **React** v18 - UI Library
- **TypeScript** v4.9 - Type safety
- **Apollo Client** v3 - GraphQL client
- **React Router** v6 - Routing
- **Styled Components** v6 - CSS-in-JS styling
- **React Icons** v4 - Icon library

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
- Displays all messages from the GraphQL API
- Shows message content and author email
- Real-time updates via Apollo Client cache

## 📁 Project Structure

\`\`\`
src/
├── pages/
│   ├── Home/        # Login/Register page
│   └── Board/       # Messages dashboard
├── services/
│   ├── api.ts       # Apollo Client configuration
│   └── history.tsx  # Browser history (legacy)
├── styles/
│   └── global.ts    # Global styles
├── App.tsx          # Main app component
├── routes.tsx       # Route configuration
└── index.tsx        # Application entry point
\`\`\`

## 🔄 Recent Updates

- ✅ Upgraded React 16 → 18
- ✅ Upgraded Apollo Client 2 → 3
- ✅ Upgraded React Router 5 → 6
- ✅ Upgraded TypeScript 3.7 → 4.9
- ✅ Upgraded Styled Components 5 → 6
- ✅ Updated to react-scripts 5.0.1
- ✅ Migrated to new React 18 createRoot API
- ✅ Updated Router to use BrowserRouter and useNavigate
- ✅ Fixed all TypeScript compilation errors
- ✅ Reduced vulnerabilities from 172 to 9 (only low/moderate severity)

## ✅ Build Status

- ✅ Build compiles successfully
- ✅ No TypeScript errors
- ✅ 9 low/moderate vulnerabilities (dev dependencies only)
- ✅ Ready for production deployment

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
