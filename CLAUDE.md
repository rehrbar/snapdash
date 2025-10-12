# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapDash is a quick web development project built with Express and TypeScript. It's a minimal Node.js web server setup designed for rapid prototyping.

## Development Commands

### Start Development Server
```bash
npm start
```
Runs the server in watch mode with hot-reloading using tsx. The server automatically restarts when source files change. Uses `.env` file for environment variables.

### Build
```bash
npm run build
```
Compiles TypeScript to JavaScript using the TypeScript compiler. Output goes to `./dist` directory.

### Run Compiled Code
After building, the compiled JavaScript is in `dist/index.js`, though there's no explicit run command for production.

## Architecture

### Tech Stack
- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **Framework**: Express 5.x
- **Language**: TypeScript with strict mode enabled
- **Dev Tooling**: tsx for development with watch mode

### Project Structure
```
/app
├── src/
│   └── index.ts          # Main application entry point
├── dist/                 # Compiled output (gitignored)
├── package.json
└── tsconfig.json
```

### Application Entry Point
The application is a single-file Express server (`src/index.ts`) that:
- Creates an Express app instance
- Configures port from `process.env.PORT` (defaults to 3000)
- Exposes a root endpoint (`/`) returning a JSON welcome message
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
- Additional environment variables can be added to `.env` file (loaded automatically by npm start)
