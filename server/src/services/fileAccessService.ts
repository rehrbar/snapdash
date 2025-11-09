import path from "path";
import fs from "fs/promises";
import * as fsSync from "fs";
import { Project } from "../db/projects.js";
import { FileNotFoundError, PathNotFileError, AccessDeniedError } from "./errors.js";

/**
 * Service for managing file access within project folders
 * Provides centralized file operations with security validation
 */

/**
 * Build the full path to a project's data folder
 * @param project - The project object
 * @param paths - Additional path segments to join
 * @returns The absolute path to the project folder
 */
export function buildProjectPath(project: Project, ...paths: string[]): string {
    return path.join(process.cwd(), "data", project.folder, ...paths);
}

/**
 * Validate that a file path is within the project's folder (security check)
 * Prevents directory traversal attacks
 * @param filePath - The full file path to validate
 * @param project - The project object
 * @returns True if the path is safe, false otherwise
 */
export function validatePathSecurity(filePath: string, project: Project): boolean {
    const projectPath = buildProjectPath(project);
    const resolvedPath = path.resolve(filePath);
    return resolvedPath.startsWith(projectPath);
}

/**
 * Read a file from the project's folder
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns The file content as a string
 * @throws {AccessDeniedError} if path is outside project folder
 * @throws {FileNotFoundError} if file doesn't exist
 * @throws {PathNotFileError} if path is not a file
 */
export async function readFile(project: Project, filePath: string): Promise<string> {
    const fullPath = buildProjectPath(project, filePath);

    if (!validatePathSecurity(fullPath, project)) {
        throw new AccessDeniedError();
    }

    // Check if file exists and is a file
    try {
        const stats = await fs.stat(fullPath);
        if (!stats.isFile()) {
            throw new PathNotFileError();
        }
    } catch (error: any) {
        if (error.code === "ENOENT") {
            throw new FileNotFoundError();
        }
        if (error instanceof PathNotFileError) {
            throw error;
        }
        throw error;
    }

    return await fs.readFile(fullPath, "utf-8");
}

/**
 * Write content to a file in the project's folder
 * Creates parent directories if they don't exist
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @param content - The content to write
 * @throws {AccessDeniedError} if path is outside project folder
 */
export async function writeFile(project: Project, filePath: string, content: string): Promise<void> {
    const fullPath = buildProjectPath(project, filePath);

    if (!validatePathSecurity(fullPath, project)) {
        throw new AccessDeniedError();
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });

    await fs.writeFile(fullPath, content, "utf-8");
}

/**
 * Delete a file from the project's folder
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @throws {AccessDeniedError} if path is outside project folder
 * @throws {FileNotFoundError} if file doesn't exist
 * @throws {PathNotFileError} if path is not a file
 */
export async function deleteFile(project: Project, filePath: string): Promise<void> {
    const fullPath = buildProjectPath(project, filePath);

    if (!validatePathSecurity(fullPath, project)) {
        throw new AccessDeniedError();
    }

    // Check if file exists and is a file
    try {
        const stats = await fs.stat(fullPath);
        if (!stats.isFile()) {
            throw new PathNotFileError();
        }
    } catch (error: any) {
        if (error.code === "ENOENT") {
            throw new FileNotFoundError();
        }
        if (error instanceof PathNotFileError) {
            throw error;
        }
        throw error;
    }

    await fs.unlink(fullPath);
}

/**
 * Create a read stream for a file in the project's folder
 * Useful for streaming binary files or large files efficiently
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns A readable stream for the file
 * @throws {AccessDeniedError} if path is outside project folder
 * @throws {FileNotFoundError} if file doesn't exist
 * @throws {PathNotFileError} if path is not a file
 */
export async function createReadStream(project: Project, filePath: string): Promise<fsSync.ReadStream> {
    const fullPath = buildProjectPath(project, filePath);

    if (!validatePathSecurity(fullPath, project)) {
        throw new AccessDeniedError();
    }

    // Check if file exists and is a file before creating stream
    try {
        const stats = await fs.stat(fullPath);
        if (!stats.isFile()) {
            throw new PathNotFileError();
        }
    } catch (error: any) {
        if (error.code === "ENOENT") {
            throw new FileNotFoundError();
        }
        if (error instanceof PathNotFileError) {
            throw error;
        }
        throw error;
    }

    return fsSync.createReadStream(fullPath);
}

/**
 * Check if a file exists in the project's folder
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns True if the file exists, false otherwise
 */
export async function fileExists(project: Project, filePath: string): Promise<boolean> {
    try {
        const fullPath = buildProjectPath(project, filePath);

        if (!validatePathSecurity(fullPath, project)) {
            return false;
        }

        await fs.access(fullPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get file stats
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns File stats
 * @throws {AccessDeniedError} if path is outside project folder
 */
export async function getFileStats(project: Project, filePath: string) {
    const fullPath = buildProjectPath(project, filePath);

    if (!validatePathSecurity(fullPath, project)) {
        throw new AccessDeniedError();
    }

    return await fs.stat(fullPath);
}

/**
 * Recursively list all files in a directory
 * @param dirPath - The directory path to list
 * @param baseDir - The base directory for calculating relative paths
 * @returns Array of relative file paths
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
 * List all files in the project's folder recursively
 * @param project - The project object
 * @returns Array of relative file paths
 */
export async function listFiles(project: Project): Promise<string[]> {
    const projectPath = buildProjectPath(project);

    // Check if directory exists
    try {
        await fs.access(projectPath);
    } catch {
        return [];
    }

    return await listFilesRecursively(projectPath, projectPath);
}

/**
 * Check if project folder exists
 * @param project - The project object
 * @returns True if the folder exists, false otherwise
 */
export async function projectFolderExists(project: Project): Promise<boolean> {
    try {
        const projectPath = buildProjectPath(project);
        await fs.access(projectPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure a directory exists within the project folder
 * Creates the directory and parent directories if they don't exist
 * @param project - The project object
 * @param dirPath - The relative directory path within the project
 * @throws {AccessDeniedError} if path is outside project folder
 */
export async function ensureDirectory(project: Project, dirPath: string): Promise<void> {
    const fullPath = buildProjectPath(project, dirPath);

    if (!validatePathSecurity(fullPath, project)) {
        throw new AccessDeniedError();
    }

    await fs.mkdir(fullPath, { recursive: true });
}
