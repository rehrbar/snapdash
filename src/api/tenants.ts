import { Router, Request, Response } from "express";
import { z } from "zod";
import * as tenantService from "../db/tenantService";

// Create a new router for tenant API endpoints
export const tenantsRouter = Router();

// Zod schema for tenant creation
const createTenantSchema = z.object({
    hosts: z.array(z.string()).min(1, "At least one host is required"),
    name: z.string().min(1, "Name is required"),
    color: z.string().regex(/^#[0-9a-fA-F]{6,8}$/, "Color must be a valid hex color (e.g., #07b379ff)")
});

// Zod schema for tenant update
const updateTenantSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6,8}$/, "Color must be a valid hex color").optional(),
    hosts: z.array(z.string()).min(1, "At least one host is required").optional()
}).refine(data => data.name !== undefined || data.color !== undefined || data.hosts !== undefined, {
    message: "At least one field (name, color, or hosts) must be provided"
});

// Zod schema for host transfer
const transferHostSchema = z.object({
    host: z.string().min(1, "Host is required"),
    targetTenantId: z.number().int().positive("Target tenant ID must be a positive integer")
});

/**
 * POST /api/tenants
 * Create a new tenant
 */
tenantsRouter.post("/tenants", (req: Request, res: Response) => {
    try {
        // Validate request body with Zod
        const validationResult = createTenantSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                error: "Validation failed",
                details: validationResult.error.issues
            });
            return;
        }

        const { hosts, name, color } = validationResult.data;

        // Check if any of the hosts already exist
        const duplicateHosts = hosts.filter(h => tenantService.hostExists(h));

        if (duplicateHosts.length > 0) {
            res.status(409).json({
                error: "The following hosts are already registered",
                hosts: duplicateHosts
            });
            return;
        }

        // Create the new tenant (folder name is auto-generated)
        const newTenant = tenantService.createTenant(name, color, hosts);

        // Return success response
        res.status(201).json({
            message: "Tenant created successfully",
            tenant: newTenant
        });
    } catch (error) {
        console.error("Error creating tenant:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * GET /api/tenants
 * List all tenants
 */
tenantsRouter.get("/tenants", (req: Request, res: Response) => {
    const allTenants = tenantService.getAllTenants();
    res.json({
        tenants: allTenants,
        count: allTenants.length
    });
});

/**
 * GET /api/tenants/:id
 * Get a single tenant by ID
 */
tenantsRouter.get("/tenants/:id", (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid tenant ID"
            });
            return;
        }

        const tenant = tenantService.findTenantById(id);

        if (!tenant) {
            res.status(404).json({
                error: "Tenant not found"
            });
            return;
        }

        res.json({
            tenant
        });
    } catch (error) {
        console.error("Error fetching tenant:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * PUT /api/tenants/:id
 * Update an existing tenant
 */
tenantsRouter.put("/tenants/:id", (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid tenant ID"
            });
            return;
        }

        // Validate request body with Zod
        const validationResult = updateTenantSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                error: "Validation failed",
                details: validationResult.error.issues
            });
            return;
        }

        const updates = validationResult.data;

        // If updating hosts, check for duplicates (excluding current tenant's hosts)
        if (updates.hosts) {
            const currentTenant = tenantService.findTenantById(id);
            if (!currentTenant) {
                res.status(404).json({
                    error: "Tenant not found"
                });
                return;
            }

            // Check if any of the new hosts are already used by other tenants
            const duplicateHosts = updates.hosts.filter(h => {
                // Host is duplicate if it exists and is not in the current tenant's hosts
                return tenantService.hostExists(h) && !currentTenant.hosts.includes(h);
            });

            if (duplicateHosts.length > 0) {
                res.status(409).json({
                    error: "The following hosts are already registered to other tenants",
                    hosts: duplicateHosts
                });
                return;
            }
        }

        // Update the tenant
        const updatedTenant = tenantService.updateTenant(id, updates);

        if (!updatedTenant) {
            res.status(404).json({
                error: "Tenant not found"
            });
            return;
        }

        res.json({
            message: "Tenant updated successfully",
            tenant: updatedTenant
        });
    } catch (error) {
        console.error("Error updating tenant:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * DELETE /api/tenants/:id
 * Delete a tenant
 */
tenantsRouter.delete("/tenants/:id", (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid tenant ID"
            });
            return;
        }

        const deleted = tenantService.deleteTenant(id);

        if (!deleted) {
            res.status(404).json({
                error: "Tenant not found"
            });
            return;
        }

        res.json({
            message: "Tenant deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting tenant:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * POST /api/tenants/transfer-host
 * Transfer a hostname from one tenant to another
 */
tenantsRouter.post("/tenants/transfer-host", (req: Request, res: Response) => {
    try {
        // Validate request body with Zod
        const validationResult = transferHostSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                error: "Validation failed",
                details: validationResult.error.issues
            });
            return;
        }

        const { host, targetTenantId } = validationResult.data;

        // Check if host exists
        if (!tenantService.hostExists(host)) {
            res.status(404).json({
                error: "Host not found"
            });
            return;
        }

        // Transfer the host
        const transferred = tenantService.transferHost(host, targetTenantId);

        if (!transferred) {
            res.status(404).json({
                error: "Target tenant not found or host does not exist"
            });
            return;
        }

        res.json({
            message: "Host transferred successfully",
            host,
            targetTenantId
        });
    } catch (error) {
        console.error("Error transferring host:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});
