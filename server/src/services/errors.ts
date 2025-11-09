/**
 * Custom error classes for file access operations
 */

/**
 * Thrown when a file is not found
 */
export class FileNotFoundError extends Error {
    constructor(message: string = "File not found") {
        super(message);
        this.name = "FileNotFoundError";
        Object.setPrototypeOf(this, FileNotFoundError.prototype);
    }
}

/**
 * Thrown when a path exists but is not a file (e.g., it's a directory)
 */
export class PathNotFileError extends Error {
    constructor(message: string = "Path is not a file") {
        super(message);
        this.name = "PathNotFileError";
        Object.setPrototypeOf(this, PathNotFileError.prototype);
    }
}

/**
 * Thrown when access to a path is denied (e.g., path traversal attempt)
 */
export class AccessDeniedError extends Error {
    constructor(message: string = "Access denied: Path is outside project folder") {
        super(message);
        this.name = "AccessDeniedError";
        Object.setPrototypeOf(this, AccessDeniedError.prototype);
    }
}
