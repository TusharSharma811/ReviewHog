# Contributing to CodeRevU

Thank you for your interest in contributing to CodeRevU! This document provides guidelines and information to help you contribute effectively.

## 🏗️ Architecture Overview

CodeRevU is a full-stack application that provides AI-powered code reviews for GitHub pull requests.

### Backend Architecture

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: Google Gemini via LangChain
- **Authentication**: GitHub OAuth
- **GitHub Integration**: GitHub App with webhooks

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Helper functions
│   ├── webhook/         # GitHub webhook handlers
│   └── routes/          # API routes
```

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: React hooks

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Helper functions
```

### Key Components

1. **GitHub Webhooks**: Handle PR events and trigger AI reviews
2. **AI Review Service**: Generate code reviews using Gemini
3. **Feedback System**: Collect user feedback on AI reviews
4. **Notification Service**: User notifications for events
5. **Dashboard**: Display PRs, reviews, and analytics

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- GitHub App configured
- Google Gemini API key

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/TusharSharma811/CodeRevU.git
   cd CodeRevU
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment template
   cp .env.example .env
   # Fill in your environment variables
   
   # Setup database
   npx prisma migrate dev
   npx prisma generate
   
   # Start development server
   npm run start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Start development server
   npm run dev
   ```

### Environment Variables

#### Backend (.env)
```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/codevu"

# GitHub App
GITHUB_APP_ID="your_app_id"
GITHUB_CLIENT_ID="your_client_id"
GITHUB_CLIENT_SECRET="your_client_secret"
GITHUB_PRIVATE_KEY="your_private_key"
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/github/callback"

# AI Service
GEMINI_API_KEY="your_gemini_api_key"

# JWT
JWT_SECRET="your_jwt_secret"

# Environment
NODE_ENV="development"
```

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled, all code must be typed
- **ESLint**: Follow the configured linting rules
- **Prettier**: Code formatting is enforced
- **Naming**: Use descriptive names, camelCase for variables/functions, PascalCase for classes/components

### Git Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to your branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests  
cd frontend && npm test

# Run linting
cd backend && npm run lint
cd frontend && npm run lint
```

### Pull Request Guidelines

1. **Keep PRs focused** - One feature/fix per PR
2. **Write clear descriptions** - Explain what and why
3. **Add tests** - Include tests for new functionality
4. **Update documentation** - Keep docs in sync
5. **Check CI** - Ensure all checks pass

## 🔧 Development Tools

### Linting and Formatting

```bash
# Install pre-commit hooks
npx husky install

# Run linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Management

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Debugging

- **Backend**: Use Node.js debugger or VS Code debugging
- **Frontend**: Use React Developer Tools
- **Database**: Use Prisma Studio
- **API**: Use tools like Postman or curl

## 📁 Project Structure

### Backend Services

- **GitHubService**: GitHub API interactions
- **AIReviewService**: AI-powered code analysis
- **FeedbackService**: User feedback management
- **NotificationService**: User notifications

### Frontend Components

- **Dashboard**: Main application view
- **ReviewCard**: Individual review display
- **FeedbackForm**: Review feedback collection
- **LoadingStates**: Loading indicators
- **ErrorBoundary**: Error handling

## 🐛 Reporting Issues

1. **Check existing issues** first
2. **Use issue templates** when available
3. **Provide clear reproduction steps**
4. **Include environment details**
5. **Add relevant logs/screenshots**

## 💡 Feature Requests

1. **Search existing requests** first
2. **Use the feature request template**
3. **Explain the use case** clearly
4. **Consider implementation complexity**
5. **Be open to discussion**

## 🔒 Security

- **Never commit secrets** to the repository
- **Use environment variables** for configuration
- **Follow security best practices**
- **Report vulnerabilities** privately

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Community

- **Be respectful** and inclusive
- **Help others** when possible
- **Share knowledge** and learn together
- **Follow the Code of Conduct**

## 📄 License

By contributing to CodeRevU, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to CodeRevU! 🎉