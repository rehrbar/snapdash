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
