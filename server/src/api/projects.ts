import { Router, Request, Response } from "express";
import { z } from "zod";
import * as projectService from "../db/projectService.js";
import cors from "cors";
import path from "path";
import fs from "fs/promises";

// Create a new router for project API endpoints
export const projectsRouter = Router();

// Zod schema for project creation
const createProjectSchema = z.object({
    hosts: z.array(z.string()).min(1, "At least one host is required"),
    name: z.string().min(1, "Name is required"),
    color: z.string().regex(/^#[0-9a-fA-F]{6,8}$/, "Color must be a valid hex color (e.g., #07b379ff)")
});

// Zod schema for project update
const updateProjectSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6,8}$/, "Color must be a valid hex color").optional(),
    hosts: z.array(z.string()).min(1, "At least one host is required").optional()
}).refine(data => data.name !== undefined || data.color !== undefined || data.hosts !== undefined, {
    message: "At least one field (name, color, or hosts) must be provided"
});

// Zod schema for host transfer
const transferHostSchema = z.object({
    host: z.string().min(1, "Host is required"),
    targetProjectId: z.number().int().positive("Target project ID must be a positive integer")
});

projectsRouter.use(cors());

/**
 * POST /api/projects
 * Create a new project
 */
projectsRouter.post("/projects", (req: Request, res: Response) => {
    try {
        // Validate request body with Zod
        const validationResult = createProjectSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                error: "Validation failed",
                details: validationResult.error.issues
            });
            return;
        }

        const { hosts, name, color } = validationResult.data;

        // Check if any of the hosts already exist
        const duplicateHosts = hosts.filter(h => projectService.hostExists(h));

        if (duplicateHosts.length > 0) {
            res.status(409).json({
                error: "The following hosts are already registered",
                hosts: duplicateHosts
            });
            return;
        }

        // Create the new project (folder name is auto-generated)
        const newProject = projectService.createProject(name, color, hosts);

        // Return success response
        res.status(201).json({
            message: "Project created successfully",
            project: newProject
        });
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * GET /api/projects
 * List all projects
 */
projectsRouter.get("/projects", (req: Request, res: Response) => {
    const allProjects = projectService.getAllProjects();
    res.json({
        projects: allProjects,
        count: allProjects.length
    });
});

/**
 * GET /api/projects/:id
 * Get a single project by ID
 */
projectsRouter.get("/projects/:id", (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const project = projectService.findProjectById(id);

        if (!project) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        res.json({
            project
        });
    } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * PUT /api/projects/:id
 * Update an existing project
 */
projectsRouter.put("/projects/:id", (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        // Validate request body with Zod
        const validationResult = updateProjectSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                error: "Validation failed",
                details: validationResult.error.issues
            });
            return;
        }

        const updates = validationResult.data;

        // If updating hosts, check for duplicates (excluding current project's hosts)
        if (updates.hosts) {
            const currentProject = projectService.findProjectById(id);
            if (!currentProject) {
                res.status(404).json({
                    error: "Project not found"
                });
                return;
            }

            // Check if any of the new hosts are already used by other projects
            const duplicateHosts = updates.hosts.filter(h => {
                // Host is duplicate if it exists and is not in the current project's hosts
                return projectService.hostExists(h) && !currentProject.hosts.includes(h);
            });

            if (duplicateHosts.length > 0) {
                res.status(409).json({
                    error: "The following hosts are already registered to other projects",
                    hosts: duplicateHosts
                });
                return;
            }
        }

        // Update the project
        const updatedProject = projectService.updateProject(id, updates);

        if (!updatedProject) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        res.json({
            message: "Project updated successfully",
            project: updatedProject
        });
    } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
projectsRouter.delete("/projects/:id", (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const deleted = projectService.deleteProject(id);

        if (!deleted) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        res.json({
            message: "Project deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * POST /api/projects/transfer-host
 * Transfer a hostname from one project to another
 */
projectsRouter.post("/projects/transfer-host", (req: Request, res: Response) => {
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

        const { host, targetProjectId } = validationResult.data;

        // Check if host exists
        if (!projectService.hostExists(host)) {
            res.status(404).json({
                error: "Host not found"
            });
            return;
        }

        // Transfer the host
        const transferred = projectService.transferHost(host, targetProjectId);

        if (!transferred) {
            res.status(404).json({
                error: "Target project not found or host does not exist"
            });
            return;
        }

        res.json({
            message: "Host transferred successfully",
            host,
            targetProjectId
        });
    } catch (error) {
        console.error("Error transferring host:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * Helper function to recursively list all files in a directory
 */
async function listFilesRecursively(dirPath: string, baseDir: string): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await listFilesRecursively(fullPath, baseDir);
                files.push(...subFiles);
            } else if (entry.isFile()) {
                // Get relative path from base directory
                const relativePath = path.relative(baseDir, fullPath);
                files.push(relativePath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
    }

    return files;
}

/**
 * GET /api/projects/:id/files
 * List all files in a project
 */
projectsRouter.get("/projects/:id/files", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const project = projectService.findProjectById(id);

        if (!project) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        // Build the project folder path
        const projectPath = path.join(process.cwd(), "data", project.folder);

        // Check if directory exists
        try {
            await fs.access(projectPath);
        } catch {
            res.json({
                project: project.name,
                files: []
            });
            return;
        }

        // List all files recursively
        const files = await listFilesRecursively(projectPath, projectPath);

        res.json({
            project: project.name,
            files: files.sort(),
            count: files.length
        });
    } catch (error) {
        console.error("Error listing files:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * GET /api/projects/:id/file?path=xxx
 * Get a specific file's content
 */
projectsRouter.get("/projects/:id/file", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const project = projectService.findProjectById(id);

        if (!project) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        // Get the file path from query parameter
        const filePath = req.query.path as string;

        if (!filePath) {
            res.status(400).json({
                error: "File path is required"
            });
            return;
        }

        // Build the full file path
        const projectPath = path.join(process.cwd(), "data", project.folder);
        const fullFilePath = path.join(projectPath, filePath);

        // Security check: ensure the resolved path is within the project's folder
        const resolvedPath = path.resolve(fullFilePath);
        if (!resolvedPath.startsWith(projectPath)) {
            res.status(403).json({
                error: "Access denied"
            });
            return;
        }

        // Check if file exists and is a file
        try {
            const stats = await fs.stat(fullFilePath);
            if (!stats.isFile()) {
                res.status(400).json({
                    error: "Path is not a file"
                });
                return;
            }
        } catch {
            res.status(404).json({
                error: "File not found"
            });
            return;
        }

        // Read file content
        const content = await fs.readFile(fullFilePath, "utf-8");

        res.json({
            project: project.name,
            path: filePath,
            content
        });
    } catch (error) {
        console.error("Error reading file:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * PUT /api/projects/:id/file
 * Set/update a file's content
 */
projectsRouter.put("/projects/:id/file", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const project = projectService.findProjectById(id);

        if (!project) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        // Get the file path and content from request body
        const { path: filePath, content } = req.body;

        if (!filePath || typeof filePath !== "string") {
            res.status(400).json({
                error: "File path is required and must be a string"
            });
            return;
        }

        if (content === undefined || typeof content !== "string") {
            res.status(400).json({
                error: "Content is required and must be a string"
            });
            return;
        }

        // Build the full file path
        const projectPath = path.join(process.cwd(), "data", project.folder);
        const fullFilePath = path.join(projectPath, filePath);

        // Security check: ensure the resolved path is within the project's folder
        const resolvedPath = path.resolve(fullFilePath);
        if (!resolvedPath.startsWith(projectPath)) {
            res.status(403).json({
                error: "Access denied"
            });
            return;
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(fullFilePath);
        await fs.mkdir(parentDir, { recursive: true });

        // Write the file (overwrites if exists)
        await fs.writeFile(fullFilePath, content, "utf-8");

        res.json({
            message: "File saved successfully",
            project: project.name,
            path: filePath
        });
    } catch (error) {
        console.error("Error writing file:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * DELETE /api/projects/:id/file?path=xxx
 * Delete a specific file
 */
projectsRouter.delete("/projects/:id/file", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const project = projectService.findProjectById(id);

        if (!project) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        // Get the file path from query parameter
        const filePath = req.query.path as string;

        if (!filePath) {
            res.status(400).json({
                error: "File path is required"
            });
            return;
        }

        // Build the full file path
        const projectPath = path.join(process.cwd(), "data", project.folder);
        const fullFilePath = path.join(projectPath, filePath);

        // Security check: ensure the resolved path is within the project's folder
        const resolvedPath = path.resolve(fullFilePath);
        if (!resolvedPath.startsWith(projectPath)) {
            res.status(403).json({
                error: "Access denied"
            });
            return;
        }

        // Check if file exists and is a file
        try {
            const stats = await fs.stat(fullFilePath);
            if (!stats.isFile()) {
                res.status(400).json({
                    error: "Path is not a file"
                });
                return;
            }
        } catch {
            res.status(404).json({
                error: "File not found"
            });
            return;
        }

        // Delete the file
        await fs.unlink(fullFilePath);

        res.json({
            message: "File deleted successfully",
            project: project.name,
            path: filePath
        });
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});
