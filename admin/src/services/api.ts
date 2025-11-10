import config from "../config";

export interface Project {
    id: number;
    name: string;
    color: string;
    folder: string;
    hosts: string[];
}

export interface CreateProjectData {
    name: string;
    color: string;
    hosts: string[];
}

export interface UpdateProjectData {
    name?: string;
    color?: string;
    hosts?: string[];
}

/**
 * Fetch all projects from the API
 */
export const getProjects = async (): Promise<Project[]> => {
    const response = await fetch(`${config.baseUrl}/api/projects`);
    if (!response.ok) {
        throw new Error('Failed to fetch projects');
    }
    const data = await response.json();
    return data.projects;
};

/**
 * Create a new project
 */
export const createProject = async (projectData: CreateProjectData): Promise<Project> => {
    const response = await fetch(`${config.baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
    });
    if (!response.ok) {
        throw new Error('Failed to create project');
    }
    return response.json();
};

/**
 * Update an existing project
 */
export const updateProject = async (id: number, projectData: UpdateProjectData): Promise<Project> => {
    const response = await fetch(`${config.baseUrl}/api/projects/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
    });
    if (!response.ok) {
        throw new Error('Failed to update project');
    }
    return response.json();
};

/**
 * Delete a project
 */
export const deleteProject = async (id: number): Promise<void> => {
    const response = await fetch(`${config.baseUrl}/api/projects/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        throw new Error('Failed to delete project');
    }
};

export interface ProjectFilesResponse {
    project: string;
    files: string[];
    count: number;
}

/**
 * Get all files in a project
 */
export const getProjectFiles = async (id: number): Promise<ProjectFilesResponse> => {
    const response = await fetch(`${config.baseUrl}/api/projects/${id}/files`);
    if (!response.ok) {
        throw new Error('Failed to fetch project files');
    }
    return response.json();
};

export interface FileContentResponse {
    project: string;
    path: string;
    content: string;
}

/**
 * Get content of a specific file in a project
 */
export const getFileContent = async (id: number, filePath: string): Promise<FileContentResponse> => {
    const response = await fetch(`${config.baseUrl}/api/projects/${id}/file?path=${encodeURIComponent(filePath)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch file content');
    }
    return response.json();
};

/**
 * Update content of a specific file in a project
 */
export const updateFileContent = async (id: number, filePath: string, content: string): Promise<void> => {
    const response = await fetch(`${config.baseUrl}/api/projects/${id}/file`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: filePath, content })
    });
    if (!response.ok) {
        throw new Error('Failed to update file content');
    }
};

/**
 * Delete a specific file in a project
 */
export const deleteFile = async (id: number, filePath: string): Promise<void> => {
    const response = await fetch(`${config.baseUrl}/api/projects/${id}/file?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        throw new Error('Failed to delete file');
    }
};

export interface UploadFileResponse {
    message: string;
    project: string;
    path: string;
    size: number;
    mimetype: string;
}

/**
 * Upload a file to a project (uses original filename)
 */
export const uploadFile = async (id: number, file: File): Promise<UploadFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${config.baseUrl}/api/projects/${id}/upload`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        throw new Error('Failed to upload file');
    }
    return response.json();
};
