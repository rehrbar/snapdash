import { pool } from "./database.js";
import { Project } from "./projects.js";

export interface ProjectRow {
    id: number;
    name: string;
    color: string;
    folder: string;
    created_at: string;
}

export interface ProjectHostRow {
    id: number;
    project_id: number;
    host: string;
}

/**
 * Convert database rows to Project object
 */
function rowsToProject(projectRow: ProjectRow, hostRows: ProjectHostRow[]): Project {
    return {
        id: projectRow.id,
        name: projectRow.name,
        color: projectRow.color,
        folder: projectRow.folder,
        hosts: hostRows.map(h => h.host)
    };
}

/**
 * Get all projects
 */
export async function getAllProjects(): Promise<Project[]> {
    const projectResult = await pool.query("SELECT * FROM projects");
    const projectRows = projectResult.rows as ProjectRow[];

    const hostResult = await pool.query("SELECT * FROM project_hosts");
    const hostRows = hostResult.rows as ProjectHostRow[];

    return projectRows.map(projectRow => {
        const projectHosts = hostRows.filter(h => h.project_id === projectRow.id);
        return rowsToProject(projectRow, projectHosts);
    });
}

/**
 * Find project by hostname
 */
export async function findProjectByHost(hostname: string): Promise<Project | undefined> {
    const hostResult = await pool.query(`
        SELECT project_id FROM project_hosts WHERE host = $1
    `, [hostname]);

    if (hostResult.rows.length === 0) {
        return undefined;
    }

    const hostRow = hostResult.rows[0] as ProjectHostRow;

    const projectResult = await pool.query(`
        SELECT * FROM projects WHERE id = $1
    `, [hostRow.project_id]);

    if (projectResult.rows.length === 0) {
        return undefined;
    }

    const projectRow = projectResult.rows[0] as ProjectRow;

    const hostRowsResult = await pool.query(`
        SELECT * FROM project_hosts WHERE project_id = $1
    `, [projectRow.id]);

    const hostRows = hostRowsResult.rows as ProjectHostRow[];

    return rowsToProject(projectRow, hostRows);
}

/**
 * Check if a host already exists
 */
export async function hostExists(host: string): Promise<boolean> {
    const result = await pool.query(`
        SELECT COUNT(*) as count FROM project_hosts WHERE host = $1
    `, [host]);

    return parseInt(result.rows[0].count) > 0;
}

/**
 * Check if a folder already exists
 */
export async function folderExists(folder: string): Promise<boolean> {
    const result = await pool.query(`
        SELECT COUNT(*) as count FROM projects WHERE folder = $1
    `, [folder]);

    return parseInt(result.rows[0].count) > 0;
}

/**
 * Generate a unique folder name based on the project name
 */
export async function generateUniqueFolderName(name: string): Promise<string> {
    // Convert name to lowercase and replace spaces/special chars with hyphens
    let baseFolder = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // If the base folder doesn't exist, use it
    if (!(await folderExists(baseFolder))) {
        return baseFolder;
    }

    // Otherwise, append a number until we find a unique one
    let counter = 1;
    let folderName = `${baseFolder}-${counter}`;

    while (await folderExists(folderName)) {
        counter++;
        folderName = `${baseFolder}-${counter}`;
    }

    return folderName;
}

/**
 * Find project by ID
 */
export async function findProjectById(id: number): Promise<Project | undefined> {
    const projectResult = await pool.query(`
        SELECT * FROM projects WHERE id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
        return undefined;
    }

    const projectRow = projectResult.rows[0] as ProjectRow;

    const hostRowsResult = await pool.query(`
        SELECT * FROM project_hosts WHERE project_id = $1
    `, [projectRow.id]);

    const hostRows = hostRowsResult.rows as ProjectHostRow[];

    return rowsToProject(projectRow, hostRows);
}

/**
 * Create a new project
 */
export async function createProject(name: string, color: string, hosts: string[]): Promise<Project> {
    // Generate unique folder name
    const folder = await generateUniqueFolderName(name);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert project
        const result = await client.query(`
            INSERT INTO projects (name, color, folder)
            VALUES ($1, $2, $3)
            RETURNING id
        `, [name, color, folder]);

        const projectId = result.rows[0].id;

        // Insert hosts
        for (const host of hosts) {
            await client.query(`
                INSERT INTO project_hosts (project_id, host)
                VALUES ($1, $2)
            `, [projectId, host]);
        }

        await client.query('COMMIT');

        // Fetch and return the created project
        const projectResult = await pool.query(`
            SELECT * FROM projects WHERE id = $1
        `, [projectId]);

        const projectRow = projectResult.rows[0] as ProjectRow;

        const hostRowsResult = await pool.query(`
            SELECT * FROM project_hosts WHERE project_id = $1
        `, [projectId]);

        const hostRows = hostRowsResult.rows as ProjectHostRow[];

        return rowsToProject(projectRow, hostRows);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Update an existing project
 */
export async function updateProject(id: number, updates: { name?: string; color?: string; hosts?: string[] }): Promise<Project | null> {
    const projectResult = await pool.query(`
        SELECT * FROM projects WHERE id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
        return null;
    }

    const projectRow = projectResult.rows[0] as ProjectRow;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update project fields if provided
        if (updates.name !== undefined || updates.color !== undefined) {
            const name = updates.name !== undefined ? updates.name : projectRow.name;
            const color = updates.color !== undefined ? updates.color : projectRow.color;

            await client.query(`
                UPDATE projects SET name = $1, color = $2 WHERE id = $3
            `, [name, color, id]);
        }

        // Update hosts if provided
        if (updates.hosts !== undefined) {
            // Delete existing hosts
            await client.query(`
                DELETE FROM project_hosts WHERE project_id = $1
            `, [id]);

            // Insert new hosts
            for (const host of updates.hosts) {
                await client.query(`
                    INSERT INTO project_hosts (project_id, host)
                    VALUES ($1, $2)
                `, [id, host]);
            }
        }

        await client.query('COMMIT');

        // Fetch and return the updated project
        const updatedProjectResult = await pool.query(`
            SELECT * FROM projects WHERE id = $1
        `, [id]);

        const updatedProjectRow = updatedProjectResult.rows[0] as ProjectRow;

        const hostRowsResult = await pool.query(`
            SELECT * FROM project_hosts WHERE project_id = $1
        `, [id]);

        const hostRows = hostRowsResult.rows as ProjectHostRow[];

        return rowsToProject(updatedProjectRow, hostRows);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Delete a project by ID
 */
export async function deleteProject(id: number): Promise<boolean> {
    const projectResult = await pool.query(`
        SELECT * FROM projects WHERE id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
        return false;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Delete hosts (will be deleted automatically due to CASCADE)
        await client.query(`
            DELETE FROM project_hosts WHERE project_id = $1
        `, [id]);

        // Delete project
        await client.query(`
            DELETE FROM projects WHERE id = $1
        `, [id]);

        await client.query('COMMIT');
        return true;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Transfer a hostname from one project to another
 */
export async function transferHost(host: string, targetProjectId: number): Promise<boolean> {
    // Check if host exists
    const hostResult = await pool.query(`
        SELECT * FROM project_hosts WHERE host = $1
    `, [host]);

    if (hostResult.rows.length === 0) {
        return false;
    }

    // Find target project
    const targetProjectResult = await pool.query(`
        SELECT * FROM projects WHERE id = $1
    `, [targetProjectId]);

    if (targetProjectResult.rows.length === 0) {
        return false;
    }

    // Update the host's project_id
    await pool.query(`
        UPDATE project_hosts SET project_id = $1 WHERE host = $2
    `, [targetProjectId, host]);

    return true;
}
