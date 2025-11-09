import { Request, Response, NextFunction } from "express";
import path from "path";
import * as fileAccessService from "../services/fileAccessService.js";
import { FileNotFoundError, AccessDeniedError } from "../services/errors.js";

/**
 * Middleware to load and serve files from the project's data folder
 * If no file is specified, serves index.html
 * Returns 404 if project is not found or file doesn't exist
 */
export const fileLoader = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if project is resolved
        if (!req.project) {
            return res.status(404).json({ error: "Project not found" });
        }

        // Get the requested path, default to index.html if root
        let requestedPath = req.path === "/" ? "index.html" : req.path;

        // Remove leading slash
        requestedPath = requestedPath.startsWith("/") ? requestedPath.slice(1) : requestedPath;

        // Build the full file path using the service
        const filePath = fileAccessService.buildProjectPath(req.project, requestedPath);

        // Security check using the service
        if (!fileAccessService.validatePathSecurity(filePath, req.project)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();

        // Only HTML files are rendered, others can be sent directly.
        if (ext !== ".html") {
            res.sendFile(filePath);
            return;
        }

        // Read the file using the service
        const fileContent = await fileAccessService.readFile(req.project, requestedPath);

        res.setHeader("Content-Type", "text/html");

        try {
            const layoutContent = await fileAccessService.readFile(req.project, "_layout.html");

            // Replace {{content}} with the actual file content
            let renderedContent = layoutContent.replace("{{content}}", fileContent);

            // TODO add an allow list for project variables which can be used in html.

            // Replace all other {{variable}} placeholders with empty string or project data
            renderedContent = renderedContent.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
                // Check if the variable exists in project object
                if (req.project && variable in req.project) {
                    const value = (req.project as any)[variable];
                    return typeof value === "string" ? value : JSON.stringify(value);
                }
                // Return empty string for undefined variables
                return "";
            });

            res.send(renderedContent);
        } catch (layoutError: any) {
            // If _layout.html doesn't exist, just serve the file as-is
            if (!(layoutError instanceof FileNotFoundError)) {
                console.error("Error loading layout:", layoutError);
            }
            res.send(fileContent);
        }
    } catch (error: any) {
        // If file not found, pass to next middleware/route handler
        if (error instanceof FileNotFoundError) {
            return next();
        }

        // If access denied, return 403
        if (error instanceof AccessDeniedError) {
            return res.status(403).json({ error: "Access denied" });
        }

        // For other errors, return 500
        console.error("Error loading file:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
