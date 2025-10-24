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
