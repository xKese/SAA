# Portfolio Analysis System

## Overview

This is a comprehensive portfolio analysis system built for Meeder & Seifer, designed to analyze investment portfolios using AI-powered analysis through Claude. The system allows users to upload portfolio files (CSV/Excel), automatically analyzes the holdings by identifying instruments, determining asset allocations, geographic distributions, currency exposure, and calculating risk metrics. The application features a full-stack architecture with a React frontend using shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Meeder & Seifer color scheme
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds
- **File Upload**: react-dropzone with Uppy for file handling
- **Portfolio Management**: Delete functionality with confirmation dialog

### Backend Architecture
- **Runtime**: Node.js with Express.js web server
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **File Processing**: Multer for multipart file uploads, XLSX library for Excel parsing
- **API Design**: RESTful endpoints with structured error handling

### Database Design
The system uses PostgreSQL with the following core tables:
- **portfolios**: Main portfolio metadata including analysis status and results
- **portfolio_positions**: Individual holdings with instrument details
- **analysis_phases**: Tracking multi-phase analysis progress
- **users**: User authentication (prepared but not implemented)

### AI Integration Architecture
- **Provider**: Anthropic Claude (using claude-sonnet-4-20250514 model)
- **Analysis Strategy**: Multi-phase portfolio analysis approach
  - Phase 0: Bulk instrument identification and categorization
  - Phase 1: Portfolio foundations analysis
  - Phase 2: Asset allocation breakdown
  - Phase 3: Geographic allocation analysis
  - Phase 4: Currency exposure analysis
  - Phase 5: Risk metrics calculation
- **Factsheet Integration**: Automatic factsheet lookup for detailed look-through analysis
  - Local factsheets stored in `investment_universe/` folder with asset class subfolder organization
  - Asset class classification from folder structure (e.g., `/Aktien/`, `/Anleihen/`)
  - Automatic ISIN matching for fund/ETF identification
  - Online factsheet search via Claude when local files not available
  - Enhanced analysis with underlying holdings data from factsheets
  - Folder-based asset class information used in analysis

### Data Processing Pipeline
1. **File Upload**: CSV/Excel files processed server-side with validation
   - Automatic detection of decimal separators (comma for German, dot for English format)
   - Support for both "1.234,56" (German) and "1,234.56" (English) number formats
2. **Instrument Identification**: AI-powered classification of holdings (stocks, ETFs, funds, bonds)
3. **Enhanced Look-Through Analysis**: 
   - Automatic factsheet retrieval for all funds/ETFs
   - Analysis of actual underlying holdings from factsheets
   - Precise calculation of effective asset allocations
   - Identification of top holdings and sector breakdown
   - Processing of 2000+ underlying instruments per portfolio
4. **Aggregation**: Calculate portfolio-level allocations and metrics based on look-through data
5. **Risk Calculation**: Generate comprehensive risk and performance metrics

### Development and Deployment
- **Development**: Hot module replacement with Vite dev server
- **Build Process**: Client builds to static assets, server bundles with esbuild
- **Environment**: Configured for Replit deployment with custom middleware
- **Database Migrations**: Drizzle-kit for schema management

## External Dependencies

### Core Services
- **Anthropic Claude AI**: Primary analysis engine for instrument identification and portfolio analysis
- **Neon Database**: PostgreSQL database hosting service
- **Google Cloud Storage**: File storage service (configured but not actively used)

### Major Libraries
- **UI Framework**: React, Radix UI, shadcn/ui components
- **Backend**: Express.js, Drizzle ORM, Multer
- **File Processing**: XLSX for Excel files, CSV parsing utilities
- **Styling**: Tailwind CSS, class-variance-authority
- **Development**: Vite, TypeScript, ESBuild

### Authentication & File Handling
- **File Upload**: Uppy ecosystem (@uppy/core, @uppy/dashboard, @uppy/aws-s3)
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Fetch API with custom request wrapper

The system is designed to be modular and extensible, with clear separation between analysis phases and support for different portfolio file formats. The AI-driven analysis approach allows for sophisticated instrument identification and portfolio decomposition while maintaining performance through bulk processing strategies.