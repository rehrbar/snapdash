import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs/promises";

/**
 * Middleware to load and serve files from the tenant's data folder
 * If no file is specified, serves index.html
 * Returns 404 if tenant is not found or file doesn't exist
 */
export const fileLoader = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if tenant is resolved
        if (!req.tenant) {
            return res.status(404).json({ error: "Tenant not found" });
        }

        // Get the requested path, default to index.html if root
        let requestedPath = req.path === "/" ? "/index.html" : req.path;

        // Remove leading slash for path.join
        requestedPath = requestedPath.startsWith("/") ? requestedPath.slice(1) : requestedPath;

        // Build the full file path
        const filePath = path.join(process.cwd(), "data", req.tenant.folder, requestedPath);

        // Security check: ensure the resolved path is within the tenant's folder
        const dataDir = path.join(process.cwd(), "data", req.tenant.folder);
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(dataDir)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Try to read the file
        let fileContent = await fs.readFile(filePath, "utf-8");

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: { [key: string]: string } = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".txt": "text/plain"
        };

        const contentType = contentTypes[ext] || "application/octet-stream";
        res.setHeader("Content-Type", contentType);

        // If HTML file, try to apply layout
        if (ext === ".html") {
            const layoutPath = path.join(process.cwd(), "data", req.tenant.folder, "_layout.html");
            try {
                const layoutContent = await fs.readFile(layoutPath, "utf-8");

                // Replace {{content}} with the actual file content
                let renderedContent = layoutContent.replace("{{content}}", fileContent);

                // Replace all other {{variable}} placeholders with empty string or tenant data
                renderedContent = renderedContent.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
                    // Check if the variable exists in tenant object
                    if (req.tenant && variable in req.tenant) {
                        const value = (req.tenant as any)[variable];
                        return typeof value === "string" ? value : JSON.stringify(value);
                    }
                    // Return empty string for undefined variables
                    return "";
                });

                fileContent = renderedContent;
            } catch (layoutError: any) {
                // If _layout.html doesn't exist, just serve the file as-is
                if (layoutError.code !== "ENOENT") {
                    console.error("Error loading layout:", layoutError);
                }
            }
        }

        // Send the file content
        res.send(fileContent);
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
