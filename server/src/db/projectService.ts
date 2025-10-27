import { db } from "./database.js";
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
export function getAllProjects(): Project[] {
    const projectRows = db.prepare("SELECT * FROM projects").all() as ProjectRow[];
    const hostRows = db.prepare("SELECT * FROM project_hosts").all() as ProjectHostRow[];

    return projectRows.map(projectRow => {
        const projectHosts = hostRows.filter(h => h.project_id === projectRow.id);
        return rowsToProject(projectRow, projectHosts);
    });
}

/**
 * Find project by hostname
 */
export function findProjectByHost(hostname: string): Project | undefined {
    const hostRow = db.prepare(`
        SELECT project_id FROM project_hosts WHERE host = ?
    `).get(hostname) as ProjectHostRow | undefined;

    if (!hostRow) {
        return undefined;
    }

    const projectRow = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(hostRow.project_id) as ProjectRow | undefined;

    if (!projectRow) {
        return undefined;
    }

    const hostRows = db.prepare(`
        SELECT * FROM project_hosts WHERE project_id = ?
    `).all(projectRow.id) as ProjectHostRow[];

    return rowsToProject(projectRow, hostRows);
}

/**
 * Check if a host already exists
 */
export function hostExists(host: string): boolean {
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM project_hosts WHERE host = ?
    `).get(host) as { count: number };

    return result.count > 0;
}

/**
 * Check if a folder already exists
 */
export function folderExists(folder: string): boolean {
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM projects WHERE folder = ?
    `).get(folder) as { count: number };

    return result.count > 0;
}

/**
 * Generate a unique folder name based on the project name
 */
export function generateUniqueFolderName(name: string): string {
    // Convert name to lowercase and replace spaces/special chars with hyphens
    let baseFolder = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // If the base folder doesn't exist, use it
    if (!folderExists(baseFolder)) {
        return baseFolder;
    }

    // Otherwise, append a number until we find a unique one
    let counter = 1;
    let folderName = `${baseFolder}-${counter}`;

    while (folderExists(folderName)) {
        counter++;
        folderName = `${baseFolder}-${counter}`;
    }

    return folderName;
}

/**
 * Find project by ID
 */
export function findProjectById(id: number): Project | undefined {
    const projectRow = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(id) as ProjectRow | undefined;

    if (!projectRow) {
        return undefined;
    }

    const hostRows = db.prepare(`
        SELECT * FROM project_hosts WHERE project_id = ?
    `).all(projectRow.id) as ProjectHostRow[];

    return rowsToProject(projectRow, hostRows);
}

/**
 * Create a new project
 */
export function createProject(name: string, color: string, hosts: string[]): Project {
    // Generate unique folder name
    const folder = generateUniqueFolderName(name);

    // Use a transaction to ensure atomicity
    const transaction = db.transaction(() => {
        // Insert project
        const result = db.prepare(`
            INSERT INTO projects (name, color, folder)
            VALUES (?, ?, ?)
        `).run(name, color, folder);

        const projectId = result.lastInsertRowid;

        // Insert hosts
        const insertHost = db.prepare(`
            INSERT INTO project_hosts (project_id, host)
            VALUES (?, ?)
        `);

        for (const host of hosts) {
            insertHost.run(projectId, host);
        }

        return projectId;
    });

    const projectId = transaction();

    // Fetch and return the created project
    const projectRow = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(projectId) as ProjectRow;

    const hostRows = db.prepare(`
        SELECT * FROM project_hosts WHERE project_id = ?
    `).all(projectId) as ProjectHostRow[];

    return rowsToProject(projectRow, hostRows);
}

/**
 * Update an existing project
 */
export function updateProject(id: number, updates: { name?: string; color?: string; hosts?: string[] }): Project | null {
    const projectRow = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(id) as ProjectRow | undefined;

    if (!projectRow) {
        return null;
    }

    const transaction = db.transaction(() => {
        // Update project fields if provided
        if (updates.name !== undefined || updates.color !== undefined) {
            const name = updates.name !== undefined ? updates.name : projectRow.name;
            const color = updates.color !== undefined ? updates.color : projectRow.color;

            db.prepare(`
                UPDATE projects SET name = ?, color = ? WHERE id = ?
            `).run(name, color, id);
        }

        // Update hosts if provided
        if (updates.hosts !== undefined) {
            // Delete existing hosts
            db.prepare(`
                DELETE FROM project_hosts WHERE project_id = ?
            `).run(id);

            // Insert new hosts
            const insertHost = db.prepare(`
                INSERT INTO project_hosts (project_id, host)
                VALUES (?, ?)
            `);

            for (const host of updates.hosts) {
                insertHost.run(id, host);
            }
        }

        return id;
    });

    transaction();

    // Fetch and return the updated project
    const updatedProjectRow = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(id) as ProjectRow;

    const hostRows = db.prepare(`
        SELECT * FROM project_hosts WHERE project_id = ?
    `).all(id) as ProjectHostRow[];

    return rowsToProject(updatedProjectRow, hostRows);
}

/**
 * Delete a project by ID
 */
export function deleteProject(id: number): boolean {
    const projectRow = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(id) as ProjectRow | undefined;

    if (!projectRow) {
        return false;
    }

    // Use a transaction to ensure atomicity
    const transaction = db.transaction(() => {
        // Delete hosts (will be deleted automatically due to CASCADE)
        db.prepare(`
            DELETE FROM project_hosts WHERE project_id = ?
        `).run(id);

        // Delete project
        db.prepare(`
            DELETE FROM projects WHERE id = ?
        `).run(id);
    });

    transaction();
    return true;
}

/**
 * Transfer a hostname from one project to another
 */
export function transferHost(host: string, targetProjectId: number): boolean {
    // Check if host exists
    const hostRow = db.prepare(`
        SELECT * FROM project_hosts WHERE host = ?
    `).get(host) as ProjectHostRow | undefined;

    if (!hostRow) {
        return false;
    }

    // Find target project
    const targetProject = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(targetProjectId) as ProjectRow | undefined;

    if (!targetProject) {
        return false;
    }

    // Update the host's project_id
    db.prepare(`
        UPDATE project_hosts SET project_id = ? WHERE host = ?
    `).run(targetProjectId, host);

    return true;
}
