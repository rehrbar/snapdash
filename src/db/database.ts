import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database connection
const dbPath = path.join(__dirname, "../../data/tenants.db");
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

/**
 * Initialize database schema
 */
export function initializeDatabase() {
    // Create tenants table
    db.exec(`
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            folder TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create tenant_hosts table (one-to-many relationship)
    db.exec(`
        CREATE TABLE IF NOT EXISTS tenant_hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            host TEXT NOT NULL UNIQUE,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tenant_hosts_host ON tenant_hosts(host);
        CREATE INDEX IF NOT EXISTS idx_tenant_hosts_tenant_id ON tenant_hosts(tenant_id);
    `);

    console.log("Database initialized successfully");
}

/**
 * Seed database with initial data if empty
 */
export function seedDatabase() {
    const count = db.prepare("SELECT COUNT(*) as count FROM tenants").get() as { count: number };

    if (count.count === 0) {
        console.log("Seeding database with initial tenants...");

        const insertTenant = db.prepare(`
            INSERT INTO tenants (name, color, folder)
            VALUES (?, ?, ?)
        `);

        const insertHost = db.prepare(`
            INSERT INTO tenant_hosts (tenant_id, host)
            VALUES (?, ?)
        `);

        // Seed demo tenant
        const demoResult = insertTenant.run("demo", "#07b379ff", "demo");
        insertHost.run(demoResult.lastInsertRowid, "localhost");
        insertHost.run(demoResult.lastInsertRowid, "demo.lvh.me");

        // Seed explorer tenant
        const explorerResult = insertTenant.run("The explorer", "#0743b3ff", "the-explorer");
        insertHost.run(explorerResult.lastInsertRowid, "explorer.lvh.me");

        console.log("Database seeded successfully");
    }
}
