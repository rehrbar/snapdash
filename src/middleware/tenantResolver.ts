import { Request, Response, NextFunction } from "express";
import { Tenant } from "../db/tenants";
import * as tenantService from "../db/tenantService";

// Extend Express Request type to include tenant
declare global {
    namespace Express {
        interface Request {
            tenant?: Tenant;
        }
    }
}

/**
 * Middleware to resolve the current tenant based on the hostname
 * Attaches the tenant object to req.tenant if found
 */
export const tenantResolver = (req: Request, res: Response, next: NextFunction) => {
    // Get the hostname from the request
    const hostname = req.hostname;

    // Find the tenant that matches this hostname from database
    const tenant = tenantService.findTenantByHost(hostname);

    if (tenant) {
        // Attach the tenant to the request context
        req.tenant = tenant;
    }

    // Continue to the next middleware/route handler
    next();
};
