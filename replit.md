# Replit.md

## Overview

This is a **dental clinic management system** (عيادة الأسنان - "Dental Clinic") built as a full-stack web application. It provides patient record management, appointment booking with calendar-based scheduling, and an admin dashboard. The entire UI is in **Arabic** with **RTL (Right-to-Left)** layout direction.

Key features:
- **User Authentication**: Session-based auth with role-based permissions (admin/doctor/assistant). Admin can manage users and assign granular permissions via a control panel.
- **Patient Management**: CRUD operations for patient records including medical history (allergies, chronic diseases, current medications)
- **Appointment Booking**: Calendar-based booking with specific day/time constraints (Sat, Sun, Mon, Thu only; 12:00–21:00 hours; 30-minute slots)
- **Dashboard**: Daily appointment overview with statistics and management controls
- **Financial Reports**: Daily, weekly, and monthly payment summaries with cash/check breakdown by currency. Revenue sourced from patient payments (manual + auto-synced from daily entries)
- **Expenses**: Expense tracking with categories (المختبر, الأدوات, الإيجار, الكهرباء, الرواتب, الصيانة, التأمين). Supports period filtering (daily/weekly/monthly/yearly) with navigation arrows and period totals. Category totals update based on selected period. PDF export with full Arabic RTL support via print window.
- **Daily Entries**: Daily operations log with patient name, treatment, doctor, amount, payment method (cash/check), and currency. Payments auto-sync to patient records with `dailyEntryId` tracking for edit/delete sync
- **Doctor/Assistant Reports**: Per-doctor and per-assistant financial inventory with salary, commission calculations (doctors only), PDF export, and WhatsApp send. Uses `/api/daily-entries/range` endpoint for date range queries. Includes **settlement tracking** via `doctor_settlements` table — admin can mark periods as paid ("تم التسليم") with amount, currency, and notes. Settlement status shown per period with delete capability. **Settlements auto-sync to expenses** under "الرواتب" category via `settlement_id` column in expenses table — creating a settlement creates an expense, deleting removes it. Assistants appear in the report with salary-only view (no commission/treatments sections)
- **WhatsApp Templates**: Database-backed template management system with variable substitution ({name}, {date}, {time}, {service}, etc.). Templates stored in `whatsapp_templates` table, managed via /whatsapp-templates page. Templates are seeded with defaults on first run.
- **Home Page**: Landing page with animated navigation cards
- **PWA Support**: Progressive Web App with manifest.json, service worker for offline caching, and installable on iOS/Android

### Authentication & Permissions
- Default admin credentials: username=admin, password=admin123 (or ADMIN_PASSWORD env var)
- Roles: admin (full access), doctor, assistant
- Permissions: appointments, patients_view, patients_edit, payments, reports, files, user_management
- Sessions stored in DB with 7-day expiry, session ID passed via x-session-id header

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state (data fetching, caching, mutations)
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, custom dark blue medical theme
- **Fonts**: Cairo (body) and Tajawal (headings) — Arabic-optimized fonts
- **Animations**: Framer Motion for page transitions and interactions
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Runtime**: Node.js with TypeScript (tsx for dev, esbuild for production)
- **Framework**: Express 5
- **API Design**: RESTful JSON API under `/api/` prefix. Routes are defined in `shared/routes.ts` as a typed contract (method, path, input/output schemas) shared between client and server
- **Validation**: Zod schemas shared between frontend and backend via `shared/` directory

### Data Layer
- **Database**: PostgreSQL via `pg` (node-postgres). Connects using `DATABASE_URL` environment variable.
- **ORM**: Drizzle ORM with `drizzle-zod` for automatic schema-to-validation generation
- **Schema Location**: `shared/schema.ts` — uses `pgTable` with PostgreSQL-compatible types
- **Table Creation**: Programmatic via `server/db.ts` `initDatabase()` on startup (CREATE TABLE IF NOT EXISTS)
- **Connection Pool**: max 10 connections, 30s idle timeout, SSL in production

### Database Schema
Tables: patients, appointments, users, sessions, whatsapp_templates, treatment_notes, expenses, expense_categories, daily_entries, doctor_settlements
- **Users**: Added `phone`, `salary` (integer), `commissionRate` (integer %) fields for doctor financial tracking
- **PostgreSQL Type Conventions**: 
  - IDs: `serial` (auto-incrementing primary key)
  - Timestamps: `text` storing ISO 8601 strings (e.g., `2025-01-15T10:30:00.000Z`)
  - Booleans: `boolean` (native PostgreSQL boolean)
  - JSON data: `jsonb` (native PostgreSQL JSONB)

### Shared Code (`shared/` directory)
- `schema.ts`: Drizzle table definitions, Zod insert schemas, TypeScript types — single source of truth
- `routes.ts`: API route contract with paths, methods, input schemas, and response schemas — used by both server route handlers and client fetch hooks

### Build & Deploy
- **Dev**: `tsx server/index.ts` with Vite dev server middleware (HMR)
- **Production Build**: Vite builds client to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- **Static Serving**: In production, Express serves the built client files with SPA fallback

### Key Design Decisions
1. **Shared route definitions**: The `shared/routes.ts` file acts as a typed API contract, ensuring client and server stay in sync on endpoints, methods, and data shapes
2. **Denormalized appointment data**: Appointments store `patientName` and `phone` directly (not just `patientId`) to support direct entry without requiring a patient record first
3. **Text-based date/time storage**: Dates stored as `YYYY-MM-DD` strings, times as `HH:mm` strings for simplicity in the booking logic
4. **RTL-first design**: The entire app is wrapped in `dir="rtl"` with Arabic fonts and RTL CSS applied globally

## External Dependencies

### Required Services
- **PostgreSQL database**: Connected via `DATABASE_URL` environment variable. Hosted on Render (free tier). Tables auto-created on startup.

### Key npm Packages
- **pg**: PostgreSQL driver for Node.js
- **drizzle-orm** + **drizzle-kit**: ORM and migration tooling
- **express** (v5): HTTP server framework
- **@tanstack/react-query**: Async state management
- **react-hook-form** + **zod**: Form handling and validation
- **date-fns**: Date manipulation with Arabic locale support (`arSA`)
- **react-day-picker**: Calendar component for appointment booking
- **framer-motion**: Animation library
- **wouter**: Lightweight client-side routing
- **lucide-react**: Icon library
- **shadcn/ui** components: Built on multiple `@radix-ui/*` primitives

### Replit-specific
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner`: Development tools (only loaded in non-production Replit environments)