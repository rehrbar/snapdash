import Database from "better-sqlite3";
import path from "path";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";

// Initialize database connection
const dbPath = path.join(process.cwd(), "data", "projects.db");

// Create parent directories of database location.
mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

/**
 * Initialize database schema
 */
export function initializeDatabase() {
    // Create projects table
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            folder TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create project_hosts table (one-to-many relationship)
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            host TEXT NOT NULL UNIQUE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_project_hosts_host ON project_hosts(host);
        CREATE INDEX IF NOT EXISTS idx_project_hosts_project_id ON project_hosts(project_id);
    `);

    console.log("Database initialized successfully");
}

/**
 * Seed database with initial data if empty
 */
export function seedDatabase() {
    const count = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };

    if (count.count === 0) {
        console.log("Seeding database with initial projects...");

        const insertProject = db.prepare(`
            INSERT INTO projects (name, color, folder)
            VALUES (?, ?, ?)
        `);

        const insertHost = db.prepare(`
            INSERT INTO project_hosts (project_id, host)
            VALUES (?, ?)
        `);

        // Seed demo project
        const demoResult = insertProject.run("demo", "#07b379ff", "demo");
        insertHost.run(demoResult.lastInsertRowid, "localhost");
        insertHost.run(demoResult.lastInsertRowid, "demo.lvh.me");

        // Seed explorer project
        const explorerResult = insertProject.run("The explorer", "#0743b3ff", "the-explorer");
        insertHost.run(explorerResult.lastInsertRowid, "explorer.lvh.me");

        console.log("Database seeded successfully");
    }
}
