# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Portfolio Analysis System for Meeder & Seifer - an AI-powered investment portfolio analyzer that uses Claude to identify instruments, analyze asset allocations, calculate risk metrics, and provide comprehensive portfolio insights. The system processes CSV/Excel portfolio files and provides detailed look-through analysis using factsheets and multi-phase AI analysis.

## Standard Workflow
1. First, think about the problem, search the code base for relevant files, and write a plan in todo.md
2. Use the ta agent to divide the tasks and assign them to the appropriate agents.
3. The plan should include a list of tasks that you can check off once completed.
4. Each analysis function of the application must be performed by the server/services/claude.ts (Claude AI) with the prompt server/services/claudeSAA.md. No own program functions may be programmed. This especially includes reading and analyzing portfolios, factsheets and simulations based on them.
5. For testing all portfolio analysis functions, use the file test_portfolio.csv
6. For every change in the backend, make sure that it is also considered in the frontend, if relevant.
7. Before you start working, check with me so I can review the plan.
8. Then start working on the tasks and gradually mark them as done.
9. Please explain to me briefly what changes have been made at each step.
10. Keep all tasks and code changes as simple as possible. We want to avoid massive or complex changes. Each change should affect as little code as possible. Simplicity is everything.
11. Finally, add a review section in the todo.md file that summarizes the changes made and any other relevant information.

## Development Commands

### Core Development
- `npm run dev` - Start development server (client on Vite dev server, API proxy to localhost:5000)
- `npm run build` - Build for production (client to dist/public, server bundle with esbuild)
- `npm run start` - Start production server from dist/index.js

### Code Quality & Testing
- `npm run check` - TypeScript type checking
- `npm run lint` - ESLint with --ext .ts,.tsx
- `npm run lint:fix` - ESLint with auto-fix
- `npm run format` - Prettier format all files
- `npm run format:check` - Check Prettier formatting

### Testing
- `npm test` - Run unit tests with Vitest
- `npm run test:ui` - Vitest UI interface
- `npm run test:run` - Single test run (CI mode)
- `npm run test:coverage` - Generate coverage reports (85% line coverage threshold)
- `npm run test:watch` - Watch mode testing
- `npm run test:e2e` - Playwright end-to-end tests
- `npm run test:e2e:ui` - Playwright UI mode

### Database Operations
- `npm run db:push` - Push schema changes to database (Drizzle Kit)

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript, Vite build tool, shadcn/ui components (Radix UI), Tailwind CSS
- **Backend**: Node.js + Express.js, TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM, Neon Database hosting
- **AI Integration**: Anthropic Claude (claude-sonnet-4-20250514 model)
- **File Processing**: Multer uploads, XLSX parsing, CSV support
- **State Management**: TanStack Query for server state
- **Routing**: Wouter (lightweight client-side routing)

### Project Structure
```
client/                 - React frontend application
  src/
    components/        - Reusable UI components (FileUpload, charts, analysis controls)
    pages/            - Main application pages (portfolio-analyzer.tsx)
    hooks/            - Custom React hooks
    lib/              - Utilities and configurations
server/               - Express.js backend
  services/           - Core business logic (claude.ts, portfolio analysis services)
  utils/              - Server utilities
shared/               - Shared TypeScript schemas and types
migrations/           - Database migration files
investment_universe/  - Factsheet storage with asset class folder structure
tests/                - Unit and integration tests
```

### Database Schema (Drizzle ORM)
- **portfolios**: Main portfolio metadata, analysis status, results storage
- **portfolio_positions**: Individual holdings with classification
- **analysis_phases**: Multi-phase analysis tracking (Phases 0-5)
- **users**: Authentication (prepared, not implemented)

### AI Analysis Pipeline
The system uses a sophisticated 6-phase analysis approach:
- **Phase 0**: Bulk instrument identification and categorization
- **Phase 1**: Portfolio foundations analysis
- **Phase 2**: Asset allocation breakdown
- **Phase 3**: Geographic allocation analysis
- **Phase 4**: Currency exposure analysis
- **Phase 5**: Risk metrics calculation

Each phase is tracked in the database with status, timing, and results.

### Factsheet Integration System
- Local factsheets stored in `investment_universe/` with asset class subfolders
- Automatic ISIN matching for fund/ETF identification
- Asset class classification from folder structure (e.g., `/Aktien/`, `/Anleihen/`)
- Online factsheet search via Claude when local files unavailable
- Look-through analysis of underlying holdings (2000+ instruments per portfolio)

### File Processing
- Supports CSV and Excel formats
- Automatic decimal separator detection (German "1.234,56" vs English "1,234.56")
- Robust parsing with multiple format strategies
- CSV parser service handles various delimiters and encodings

## Important File Locations

### Configuration Files
- `vite.config.ts` - Vite build configuration with path aliases (@, @shared, @assets)
- `tsconfig.json` - TypeScript configuration with path mapping
- `drizzle.config.ts` - Database ORM configuration
- `tailwind.config.ts` - Styling configuration
- `vitest.config.ts` - Unit test configuration with coverage thresholds
- `playwright.config.ts` - E2E test configuration

### Key Source Files
- `server/index.ts` - Main Express server with middleware setup
- `server/routes.ts` - API endpoint definitions
- `server/services/claude.ts` - Core AI analysis service (296KB, main logic)
- `shared/schema.ts` - Database schema definitions and Zod validation
- `client/src/pages/portfolio-analyzer.tsx` - Main application interface
- `client/src/components/FileUpload.tsx` - Portfolio file upload component

### Path Aliases
- `@/` maps to `client/src/`
- `@shared/` maps to `shared/`
- `@assets/` maps to `attached_assets/`

## Development Notes

### Number Format Handling
The system automatically detects and handles different number formats:
- German format: "1.234,56" (thousands separator: dot, decimal: comma)
- English format: "1,234.56" (thousands separator: comma, decimal: dot)

### File Upload Processing
- Uses Multer for multipart uploads
- Supports both CSV and Excel files
- Automatic validation and format detection
- Error handling for malformed files

### AI Integration Patterns
- Bulk processing for performance (batch instrument identification)
- Structured prompting with specific analysis phases
- Result caching and incremental analysis
- Factsheet integration for enhanced accuracy

### Database Patterns
- Use Drizzle ORM for all database operations
- Schema is defined in `shared/schema.ts`
- Migrations managed via drizzle-kit
- JSON columns for storing complex analysis results

### Error Handling
- Comprehensive error boundaries in React components
- Structured API error responses
- Analysis phase failure recovery
- File processing error reporting

### Testing Strategy
- Unit tests with Vitest (85% coverage requirement)
- E2E tests with Playwright
- Component testing with React Testing Library
- Coverage thresholds enforced in CI/CD

## Common Development Patterns

### API Endpoints
RESTful design with structured responses:
- `POST /api/portfolios` - Upload and create portfolio
- `GET /api/portfolios/:id` - Get portfolio with analysis
- `POST /api/portfolios/:id/analyze` - Trigger analysis
- `GET /api/portfolios/:id/analysis/:phase` - Get specific phase results

### Component Structure
- Use shadcn/ui components as base
- Implement proper error boundaries
- Follow React Hook patterns with TanStack Query
- Proper TypeScript typing throughout

### State Management
- Server state via TanStack Query
- Local state via React useState/useEffect
- No global state management (Redux/Zustand not used)

When working with this codebase, prioritize the existing patterns and architecture. The system is designed for performance with large portfolios (2000+ holdings) and complex AI-driven analysis workflows.