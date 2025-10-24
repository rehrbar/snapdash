import { db } from "./database";
import { Tenant } from "../tenants";

export interface TenantRow {
    id: number;
    name: string;
    color: string;
    folder: string;
    created_at: string;
}

export interface TenantHostRow {
    id: number;
    tenant_id: number;
    host: string;
}

/**
 * Convert database rows to Tenant object
 */
function rowsToTenant(tenantRow: TenantRow, hostRows: TenantHostRow[]): Tenant {
    return {
        name: tenantRow.name,
        color: tenantRow.color,
        folder: tenantRow.folder,
        hosts: hostRows.map(h => h.host)
    };
}

/**
 * Get all tenants
 */
export function getAllTenants(): Tenant[] {
    const tenantRows = db.prepare("SELECT * FROM tenants").all() as TenantRow[];
    const hostRows = db.prepare("SELECT * FROM tenant_hosts").all() as TenantHostRow[];

    return tenantRows.map(tenantRow => {
        const tenantHosts = hostRows.filter(h => h.tenant_id === tenantRow.id);
        return rowsToTenant(tenantRow, tenantHosts);
    });
}

/**
 * Find tenant by hostname
 */
export function findTenantByHost(hostname: string): Tenant | undefined {
    const hostRow = db.prepare(`
        SELECT tenant_id FROM tenant_hosts WHERE host = ?
    `).get(hostname) as TenantHostRow | undefined;

    if (!hostRow) {
        return undefined;
    }

    const tenantRow = db.prepare(`
        SELECT * FROM tenants WHERE id = ?
    `).get(hostRow.tenant_id) as TenantRow | undefined;

    if (!tenantRow) {
        return undefined;
    }

    const hostRows = db.prepare(`
        SELECT * FROM tenant_hosts WHERE tenant_id = ?
    `).all(tenantRow.id) as TenantHostRow[];

    return rowsToTenant(tenantRow, hostRows);
}

/**
 * Check if a host already exists
 */
export function hostExists(host: string): boolean {
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM tenant_hosts WHERE host = ?
    `).get(host) as { count: number };

    return result.count > 0;
}

/**
 * Check if a folder already exists
 */
export function folderExists(folder: string): boolean {
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM tenants WHERE folder = ?
    `).get(folder) as { count: number };

    return result.count > 0;
}

/**
 * Generate a unique folder name based on the tenant name
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
 * Create a new tenant
 */
export function createTenant(name: string, color: string, hosts: string[]): Tenant {
    // Generate unique folder name
    const folder = generateUniqueFolderName(name);

    // Use a transaction to ensure atomicity
    const transaction = db.transaction(() => {
        // Insert tenant
        const result = db.prepare(`
            INSERT INTO tenants (name, color, folder)
            VALUES (?, ?, ?)
        `).run(name, color, folder);

        const tenantId = result.lastInsertRowid;

        // Insert hosts
        const insertHost = db.prepare(`
            INSERT INTO tenant_hosts (tenant_id, host)
            VALUES (?, ?)
        `);

        for (const host of hosts) {
            insertHost.run(tenantId, host);
        }

        return tenantId;
    });

    const tenantId = transaction();

    // Fetch and return the created tenant
    const tenantRow = db.prepare(`
        SELECT * FROM tenants WHERE id = ?
    `).get(tenantId) as TenantRow;

    const hostRows = db.prepare(`
        SELECT * FROM tenant_hosts WHERE tenant_id = ?
    `).all(tenantId) as TenantHostRow[];

    return rowsToTenant(tenantRow, hostRows);
}
