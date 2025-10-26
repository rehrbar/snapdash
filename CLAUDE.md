# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapDash is a multi-project rapid web development platform with two main components:
- **Server**: Express and TypeScript backend API with SQLite database for project management
- **Admin UI**: React-based admin UI for managing projects

## Project Structure
```
/app
├── server/               # Backend server application
│   ├── src/
│   │   ├── index.ts     # Main application entry point
│   │   ├── api/         # API route handlers
│   │   ├── db/          # Database layer and services
│   │   └── middleware/  # Express middleware
│   ├── data/            # SQLite database and project files
│   ├── dist/            # Compiled output (gitignored)
│   ├── package.json
│   └── tsconfig.json
├── admin/                # React admin UI application
│   ├── src/             # React components and application code
│   ├── public/          # Static assets
│   ├── build/           # Production build output (gitignored)
│   └── package.json
└── CLAUDE.md            # This file
```

## Development Commands

### Server Development

Navigate to the `server` directory for all server commands:

```bash
cd server
```

#### Start Development Server
```bash
npm start
```
Runs the server in watch mode with hot-reloading using tsx. The server automatically restarts when source files change. Uses `.env` file for environment variables.

#### Build
```bash
npm run build
```
Compiles TypeScript to JavaScript using the TypeScript compiler. Output goes to `./dist` directory.

#### Run Compiled Code
After building, the compiled JavaScript is in `dist/index.js`, though there's no explicit run command for production.

### Admin Development

Navigate to the `admin` directory for all admin UI commands:

```bash
cd admin
```

#### Start Development Server
```bash
npm start
```
Runs the React app in development mode with hot-reloading. Opens [http://localhost:3000](http://localhost:3000) in the browser. The page reloads when you make changes.

#### Build
```bash
npm run build
```
Builds the React app for production to the `build` directory. Optimizes the build for best performance with minified bundles.

#### Run Tests
```bash
npm test
```
Launches the test runner in interactive watch mode using React Testing Library.

## Admin Architecture

### Tech Stack
- **Framework**: React 19.x
- **Build Tool**: Create React App (react-scripts)
- **Testing**: React Testing Library, Jest

## Server Architecture

### Tech Stack
- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **Framework**: Express 5.x
- **Language**: TypeScript with strict mode enabled
- **Database**: SQLite (better-sqlite3)
- **Validation**: Zod
- **Dev Tooling**: tsx for development with watch mode

### Application Entry Point
The application is an Express server (`server/src/index.ts`) that:
- Initializes SQLite database with project schema
- Creates an Express app instance
- Configures port from `process.env.PORT` (defaults to 3001)
- Mounts project management API routes at `/api/projects`
- Applies project resolution middleware for host-based routing
- Serves static files from project-specific folders
- Starts listening on the configured port

### TypeScript Configuration
- **Target**: ESNext
- **Module System**: NodeNext (modern Node.js ES modules)
- **Strict Mode**: Enabled
- **Source Maps**: Generated for debugging
- **Output**: `./dist`
- **Include**: All files in `src/**/*`

## Environment Variables
- `PORT`: Server port (default: 3001)
- Additional environment variables can be added to `.env` file in the `server` directory (loaded automatically by npm start)
