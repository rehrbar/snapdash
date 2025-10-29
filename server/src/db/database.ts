import pg from "pg";

const { Pool } = pg;

// Initialize PostgreSQL connection pool
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'snapdash',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export async function waitForDatabase() {
    for (let i = 0; i < 10; i++) {
        try {
            await pool.query('SELECT NOW()');
            return;
        } catch {
            console.log("Database not ready, try again...");
            await delay(2000);
        }
    }
}

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
    // Create projects table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            folder TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create project_hosts table (one-to-many relationship)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS project_hosts (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL,
            host TEXT NOT NULL UNIQUE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for performance
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_project_hosts_host ON project_hosts(host)
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_project_hosts_project_id ON project_hosts(project_id)
    `);

    console.log("Database initialized successfully");
}

/**
 * Seed database with initial data if empty
 */
export async function seedDatabase() {
    const result = await pool.query("SELECT COUNT(*) as count FROM projects");
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
        console.log("Seeding database with initial projects...");

        // Seed demo project
        const demoResult = await pool.query(`
            INSERT INTO projects (name, color, folder)
            VALUES ($1, $2, $3)
            RETURNING id
        `, ["demo", "#07b379ff", "demo"]);

        const demoId = demoResult.rows[0].id;

        await pool.query(`
            INSERT INTO project_hosts (project_id, host)
            VALUES ($1, $2)
        `, [demoId, "localhost"]);

        await pool.query(`
            INSERT INTO project_hosts (project_id, host)
            VALUES ($1, $2)
        `, [demoId, "demo.lvh.me"]);

        // Seed explorer project
        const explorerResult = await pool.query(`
            INSERT INTO projects (name, color, folder)
            VALUES ($1, $2, $3)
            RETURNING id
        `, ["The explorer", "#0743b3ff", "the-explorer"]);

        const explorerId = explorerResult.rows[0].id;

        await pool.query(`
            INSERT INTO project_hosts (project_id, host)
            VALUES ($1, $2)
        `, [explorerId, "explorer.lvh.me"]);

        console.log("Database seeded successfully");
    }
}
