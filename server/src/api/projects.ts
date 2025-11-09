import { Router, Request, Response } from "express";
import { z } from "zod";
import * as projectService from "../db/projectService.js";
import * as fileAccessService from "../services/fileAccessService.js";
import { FileNotFoundError, PathNotFileError, AccessDeniedError } from "../services/errors.js";
import cors from "cors";

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
projectsRouter.post("/projects", async (req: Request, res: Response) => {
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
        const duplicateHostChecks = await Promise.all(
            hosts.map(async h => ({ host: h, exists: await projectService.hostExists(h) }))
        );
        const duplicateHosts = duplicateHostChecks.filter(h => h.exists).map(h => h.host);

        if (duplicateHosts.length > 0) {
            res.status(409).json({
                error: "The following hosts are already registered",
                hosts: duplicateHosts
            });
            return;
        }

        // Create the new project (folder name is auto-generated)
        const newProject = await projectService.createProject(name, color, hosts);

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
projectsRouter.get("/projects", async (req: Request, res: Response) => {
    try {
        const allProjects = await projectService.getAllProjects();
        res.json({
            projects: allProjects,
            count: allProjects.length
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

/**
 * GET /api/projects/:id
 * Get a single project by ID
 */
projectsRouter.get("/projects/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const project = await projectService.findProjectById(id);

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
projectsRouter.put("/projects/:id", async (req: Request, res: Response) => {
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
            const currentProject = await projectService.findProjectById(id);
            if (!currentProject) {
                res.status(404).json({
                    error: "Project not found"
                });
                return;
            }

            // Check if any of the new hosts are already used by other projects
            const duplicateHostChecks = await Promise.all(
                updates.hosts.map(async h => ({
                    host: h,
                    exists: await projectService.hostExists(h),
                    inCurrentProject: currentProject.hosts.includes(h)
                }))
            );
            const duplicateHosts = duplicateHostChecks
                .filter(h => h.exists && !h.inCurrentProject)
                .map(h => h.host);

            if (duplicateHosts.length > 0) {
                res.status(409).json({
                    error: "The following hosts are already registered to other projects",
                    hosts: duplicateHosts
                });
                return;
            }
        }

        // Update the project
        const updatedProject = await projectService.updateProject(id, updates);

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
projectsRouter.delete("/projects/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            res.status(400).json({
                error: "Invalid project ID"
            });
            return;
        }

        const deleted = await projectService.deleteProject(id);

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
projectsRouter.post("/projects/transfer-host", async (req: Request, res: Response) => {
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
        if (!(await projectService.hostExists(host))) {
            res.status(404).json({
                error: "Host not found"
            });
            return;
        }

        // Transfer the host
        const transferred = await projectService.transferHost(host, targetProjectId);

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

        const project = await projectService.findProjectById(id);

        if (!project) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }

        // List all files using the service
        const files = await fileAccessService.listFiles(project);

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

        const project = await projectService.findProjectById(id);

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

        // Read file content using the service (validates file exists and is a file)
        const content = await fileAccessService.readFile(project, filePath);

        res.json({
            project: project.name,
            path: filePath,
            content
        });
    } catch (error: any) {
        if (error instanceof AccessDeniedError) {
            res.status(403).json({
                error: "Access denied"
            });
            return;
        }

        if (error instanceof FileNotFoundError) {
            res.status(404).json({
                error: "File not found"
            });
            return;
        }

        if (error instanceof PathNotFileError) {
            res.status(400).json({
                error: "Path is not a file"
            });
            return;
        }

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

        const project = await projectService.findProjectById(id);

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

        // Write the file using the service (includes security checks)
        await fileAccessService.writeFile(project, filePath, content);

        res.json({
            message: "File saved successfully",
            project: project.name,
            path: filePath
        });
    } catch (error: any) {
        if (error instanceof AccessDeniedError) {
            res.status(403).json({
                error: "Access denied"
            });
            return;
        }

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

        const project = await projectService.findProjectById(id);

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

        // Delete the file using the service (validates file exists and is a file)
        await fileAccessService.deleteFile(project, filePath);

        res.json({
            message: "File deleted successfully",
            project: project.name,
            path: filePath
        });
    } catch (error: any) {
        if (error instanceof AccessDeniedError) {
            res.status(403).json({
                error: "Access denied"
            });
            return;
        }

        if (error instanceof FileNotFoundError) {
            res.status(404).json({
                error: "File not found"
            });
            return;
        }

        if (error instanceof PathNotFileError) {
            res.status(400).json({
                error: "Path is not a file"
            });
            return;
        }

        console.error("Error deleting file:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});
