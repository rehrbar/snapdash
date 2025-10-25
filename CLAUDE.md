# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapDash is a multi-project rapid web development platform with two main components:
- **Server**: Express and TypeScript backend API with SQLite database for project management
- **UI**: (Planned) Frontend interface for managing projects

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
- Configures port from `process.env.PORT` (defaults to 3000)
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
- `PORT`: Server port (default: 3000)
- Additional environment variables can be added to `.env` file in the `server` directory (loaded automatically by npm start)
