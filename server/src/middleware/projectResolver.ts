import { Request, Response, NextFunction } from "express";
import { Project } from "../db/projects.js";
import * as projectService from "../db/projectService.js";

// Extend Express Request type to include project
declare global {
    namespace Express {
        interface Request {
            project?: Project;
        }
    }
}

/**
 * Middleware to resolve the current project based on the hostname
 * Attaches the project object to req.project if found
 */
export const projectResolver = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get the hostname from the request
        const hostname = req.hostname;

        // Find the project that matches this hostname from database
        const project = await projectService.findProjectByHost(hostname);

        if (project) {
            // Attach the project to the request context
            req.project = project;
        }

        // Continue to the next middleware/route handler
        next();
    } catch (error) {
        console.error("Error resolving project:", error);
        next(error);
    }
};
