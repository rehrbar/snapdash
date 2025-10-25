import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs/promises";

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
        let requestedPath = req.path === "/" ? "/index.html" : req.path;

        // Remove leading slash for path.join
        requestedPath = requestedPath.startsWith("/") ? requestedPath.slice(1) : requestedPath;

        // Build the full file path
        const filePath = path.join(process.cwd(), "data", req.project.folder, requestedPath);

        // Security check: ensure the resolved path is within the project's folder
        const dataDir = path.join(process.cwd(), "data", req.project.folder);
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(dataDir)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();

        // Only HTML files are rendered, others can be sent directly.
        if (ext !== ".html") {
            res.sendFile(filePath);
            return;
        }

        // Read the file (as text or binary)
        const fileContent = await fs.readFile(filePath, "utf-8")

        res.setHeader("Content-Type", "text/html");

        const layoutPath = path.join(process.cwd(), "data", req.project.folder, "_layout.html");
        try {
            const layoutContent = await fs.readFile(layoutPath, "utf-8");

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
            if (layoutError.code !== "ENOENT") {
                console.error("Error loading layout:", layoutError);
            }
            res.send(fileContent);
        }
    } catch (error: any) {
        // If file not found, pass to next middleware/route handler
        if (error.code === "ENOENT") {
            return next();
        }

        // For other errors, return 500
        console.error("Error loading file:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
