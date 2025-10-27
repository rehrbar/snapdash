# SnapDash

A multi-project rapid web development platform with host-based routing, dynamic project management, and integrated file storage.

## Features

- **Multi-Project Architecture**: Host-based routing automatically resolves projects from domain names
- **Dynamic Project Management**: Create and manage multiple projects without extensive setup
- **Integrated File Storage**: Static assets (JS, HTML, CSS, images) stored in MongoDB or object storage
- **Serverless API Functions**: Deploy small functions that execute in isolated sandboxes
- **Unified Permissions**: Projects bind together files, APIs, and access controls
- **Version Control & Publishing**: Built-in versioning with ability to publish specific versions
- **LLM Integration**: MCP interface enables AI assistants to create and manage projects and files
- **Activity Tracking**: Monitor all interactions across projects and resources

## Quick Start with Docker Compose

The easiest way to run SnapDash is using Docker Compose, which starts both the server and admin UI:

```bash
# Start all services in detached mode
docker compose up -d

# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f server
docker compose logs -f admin

# Stop all services
docker compose down

# Rebuild and restart services
docker compose up -d --build

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

Once started, access:

- **Admin UI**: http://localhost:3000
- **Server API**: http://localhost:3001
