import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
    CreateBucketCommand,
    HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { Project } from "../db/projects.js";
import { FileNotFoundError, PathNotFileError, AccessDeniedError } from "./errors.js";
import path from "path";
import { Readable } from "stream";

/**
 * S3-compatible storage service for managing project files
 * Uses SeaweedFS as the S3-compatible storage backend
 */

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://seaweedfs:8333",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "snapdash-access-key",
        secretAccessKey: process.env.S3_SECRET_KEY || "snapdash-secret-key",
    },
    forcePathStyle: true, // Required for SeaweedFS and MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET || "snapdash-projects";

/**
 * Build the S3 object key for a file within a project
 * @param project - The project object
 * @param filePath - The relative file path within the project
 * @returns The S3 object key
 */
export function buildS3Key(project: Project, filePath: string = ""): string {
    // Handle empty filePath to avoid path.normalize("") returning "."
    if (!filePath) {
        return `${project.folder}/`;
    }
    // Normalize the path to prevent directory traversal
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
    return `${project.folder}/${normalizedPath}`.replace(/\\/g, "/");
}

/**
 * Validate that a file path doesn't contain directory traversal attempts
 * @param filePath - The file path to validate
 * @returns True if the path is safe, false otherwise
 */
export function validatePathSecurity(filePath: string): boolean {
    const normalized = path.normalize(filePath);
    // Reject paths that try to go up directories
    return !normalized.includes("..") && !path.isAbsolute(normalized);
}

/**
 * Read a file from S3 storage
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns The file content as a string
 * @throws {AccessDeniedError} if path is invalid
 * @throws {FileNotFoundError} if file doesn't exist
 */
export async function readFile(project: Project, filePath: string): Promise<string> {
    if (!validatePathSecurity(filePath)) {
        throw new AccessDeniedError();
    }

    const key = buildS3Key(project, filePath);

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            throw new FileNotFoundError();
        }

        // Convert stream to string
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString("utf-8");
    } catch (error: any) {
        if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
            throw new FileNotFoundError();
        }
        throw error;
    }
}

/**
 * Write content to a file in S3 storage
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @param content - The content to write
 * @throws {AccessDeniedError} if path is invalid
 */
export async function writeFile(project: Project, filePath: string, content: string): Promise<void> {
    if (!validatePathSecurity(filePath)) {
        throw new AccessDeniedError();
    }

    const key = buildS3Key(project, filePath);

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: content,
        ContentType: "text/plain",
    });

    await s3Client.send(command);
}

/**
 * Write binary data to a file in S3 storage
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @param buffer - The binary data to write
 * @throws {AccessDeniedError} if path is invalid
 */
export async function writeBinaryFile(project: Project, filePath: string, buffer: Buffer): Promise<void> {
    if (!validatePathSecurity(filePath)) {
        throw new AccessDeniedError();
    }

    const key = buildS3Key(project, filePath);

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "application/octet-stream",
    });

    await s3Client.send(command);
}

/**
 * Delete a file from S3 storage
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @throws {AccessDeniedError} if path is invalid
 * @throws {FileNotFoundError} if file doesn't exist
 */
export async function deleteFile(project: Project, filePath: string): Promise<void> {
    if (!validatePathSecurity(filePath)) {
        throw new AccessDeniedError();
    }

    const key = buildS3Key(project, filePath);

    // First check if file exists
    try {
        const headCommand = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        await s3Client.send(headCommand);
    } catch (error: any) {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
            throw new FileNotFoundError();
        }
        throw error;
    }

    // Delete the object
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
}

/**
 * Create a read stream for a file in S3 storage
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns A readable stream for the file
 * @throws {AccessDeniedError} if path is invalid
 * @throws {FileNotFoundError} if file doesn't exist
 */
export async function createReadStream(project: Project, filePath: string): Promise<Readable> {
    if (!validatePathSecurity(filePath)) {
        throw new AccessDeniedError();
    }

    const key = buildS3Key(project, filePath);

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            throw new FileNotFoundError();
        }

        return response.Body as Readable;
    } catch (error: any) {
        if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
            throw new FileNotFoundError();
        }
        throw error;
    }
}

/**
 * Check if a file exists in S3 storage
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns True if the file exists, false otherwise
 */
export async function fileExists(project: Project, filePath: string): Promise<boolean> {
    if (!validatePathSecurity(filePath)) {
        return false;
    }

    const key = buildS3Key(project, filePath);

    try {
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        await s3Client.send(command);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get file metadata
 * @param project - The project object
 * @param filePath - The relative path to the file within the project
 * @returns File metadata
 * @throws {AccessDeniedError} if path is invalid
 * @throws {FileNotFoundError} if file doesn't exist
 */
export async function getFileStats(project: Project, filePath: string) {
    if (!validatePathSecurity(filePath)) {
        throw new AccessDeniedError();
    }

    const key = buildS3Key(project, filePath);

    try {
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        const response = await s3Client.send(command);

        return {
            size: response.ContentLength || 0,
            lastModified: response.LastModified,
            contentType: response.ContentType,
            isFile: () => true,
            isDirectory: () => false,
        };
    } catch (error: any) {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
            throw new FileNotFoundError();
        }
        throw error;
    }
}

/**
 * List all files in a project's S3 prefix
 * @param project - The project object
 * @returns Array of relative file paths
 */
export async function listFiles(project: Project): Promise<string[]> {
    const prefix = buildS3Key(project);
    const files: string[] = [];

    let continuationToken: string | undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
            for (const object of response.Contents) {
                if (object.Key) {
                    // Remove the project prefix to get relative path
                    const relativePath = object.Key.substring(prefix.length);
                    if (relativePath) {
                        files.push(relativePath);
                    }
                }
            }
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
}

/**
 * Check if project folder exists (has any objects)
 * @param project - The project object
 * @returns True if the folder has objects, false otherwise
 */
export async function projectFolderExists(project: Project): Promise<boolean> {
    const prefix = buildS3Key(project);

    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            MaxKeys: 1,
        });

        const response = await s3Client.send(command);
        return (response.Contents?.length || 0) > 0;
    } catch {
        return false;
    }
}

/**
 * Ensure a directory exists (no-op for S3 since directories are virtual)
 * @param project - The project object
 * @param dirPath - The relative directory path within the project
 */
export async function ensureDirectory(project: Project, dirPath: string): Promise<void> {
    // In S3, directories are virtual and created automatically when objects are created
    // This is a no-op for compatibility with the filesystem interface
    if (!validatePathSecurity(dirPath)) {
        throw new AccessDeniedError();
    }
}

/**
 * Initialize the S3 bucket (create if it doesn't exist)
 * Should be called on application startup
 */
export async function initializeBucket(): Promise<void> {
    try {
        const command = new CreateBucketCommand({
            Bucket: BUCKET_NAME,
        });
        await s3Client.send(command);
        console.log(`✓ S3 bucket created successfully: ${BUCKET_NAME}`);
    } catch (error: any) {
        // Bucket already exists - this is fine
        if (error.name === "BucketAlreadyOwnedByYou" || error.name === "BucketAlreadyExists") {
            console.log(`✓ S3 bucket already exists: ${BUCKET_NAME}`);
        } else {
            console.error(`✗ Failed to create S3 bucket: ${error.message}`);
            throw error;
        }
    }
}

function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

// TODO combine this with the bucket creation above.
export async function waitForS3(): Promise<void> {
    for (let i = 0; i < 10; i++) {
        try {
            await s3Client.send(new HeadBucketCommand({Bucket: BUCKET_NAME}));
            console.log(`✓ S3 connection established successfully`);
            return;
        } catch {
            console.log("S3 is not ready, try again...");
            await delay(5000);
        }
    }
}