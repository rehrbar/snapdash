# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapDash is a multi-project rapid web development platform with two main components:
- **Server**: Express and TypeScript backend API with PostgreSQL database for project management and S3-compatible storage (SeaweedFS) for file storage
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
- **Database**: PostgreSQL (via pg driver)
- **Storage**: S3-compatible storage using SeaweedFS (default) or filesystem (legacy)
- **S3 Client**: AWS SDK for JavaScript v3 (@aws-sdk/client-s3)
- **Validation**: Zod
- **File Upload**: Multer (with memory storage, 10MB limit)
- **Dev Tooling**: tsx for development with watch mode

### Application Entry Point
The application is an Express server (`server/src/index.ts`) that:
- Waits for database connection
- Initializes PostgreSQL database with project schema
- Initializes S3 storage (or filesystem storage if configured)
- Creates an Express app instance
- Configures port from `process.env.PORT` (defaults to 3001)
- Mounts project management API routes at `/api/projects`
- Applies project resolution middleware for host-based routing
- Serves static files from project-specific S3 storage
- Starts listening on the configured port

### TypeScript Configuration
- **Target**: ESNext
- **Module System**: NodeNext (modern Node.js ES modules)
- **Strict Mode**: Enabled
- **Source Maps**: Generated for debugging
- **Output**: `./dist`
- **Include**: All files in `src/**/*`

## API Endpoints

### Project Management
- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get a single project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project
- `POST /api/projects/transfer-host` - Transfer a hostname between projects

### File Management
- `GET /api/projects/:id/files` - List all files in a project
- `GET /api/projects/:id/file?path=xxx` - Get file content
- `PUT /api/projects/:id/file` - Update/create file content (text files)
- `DELETE /api/projects/:id/file?path=xxx` - Delete a file
- `POST /api/projects/:id/upload` - Upload a file (binary/images, uses original filename, 10MB limit)

### File Storage Service
The file storage service (`fileAccessService`) uses S3-compatible object storage for all file operations:

**Storage Implementation:**
- Uses SeaweedFS (S3-compatible) by default
- Compatible with any S3-compatible storage (AWS S3, MinIO, etc.)
- Change the `S3_ENDPOINT` to use different storage backends

**API:**
- `writeFile()` - Write text content to files
- `writeBinaryFile()` - Write binary data (Buffer) to files
- `readFile()` - Read file content as text
- `deleteFile()` - Delete files
- `listFiles()` - Recursively list all files
- `createReadStream()` - Stream files efficiently
- `fileExists()` - Check if file exists
- All operations validate paths to prevent directory traversal attacks

**Features:**
- Files stored in S3-compatible object storage (SeaweedFS by default)
- Project files organized by folder prefix in a single bucket
- Automatic bucket initialization on startup
- Support for AWS S3, MinIO, or any S3-compatible storage

## Environment Variables

See `server/.env.example` for all available configuration options. Key variables:

**Server:**
- `PORT`: Server port (default: 3001)

**Database:**
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: snapdash)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password

**S3 Storage:**
- `S3_ENDPOINT`: S3 endpoint URL (e.g., http://seaweedfs:8333 for SeaweedFS)
- `S3_REGION`: AWS region (default: us-east-1)
- `S3_ACCESS_KEY`: S3 access key
- `S3_SECRET_KEY`: S3 secret key
- `S3_BUCKET`: S3 bucket name (default: snapdash-projects)

## Storage Documentation

For detailed information about the S3 storage configuration and troubleshooting, see [STORAGE.md](../STORAGE.md).
