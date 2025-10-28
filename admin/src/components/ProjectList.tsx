import { useEffect, useState } from "react";
import { getProjects, deleteProject, Project } from "../services/api";
import React from "react";
import { Link } from "react-router";

interface ProjectListProps {
    onEdit: (project: Project) => void;
    refreshTrigger?: number;
}

const ProjectList: React.FC<ProjectListProps> = ({ onEdit, refreshTrigger }) => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProjects();
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, [refreshTrigger]);

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this project?')) {
            return;
        }

        try {
            await deleteProject(id);
            // Refresh the list after deletion
            loadProjects();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete project');
        }
    };

    return (
        <>
            <h1>Projects</h1>
            {loading && <span>Loading...</span>}
            {error && <div>{error}</div>}
            {!loading && projects.length > 0 && (
                <table className="text-left w-full">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Color</th>
                            <th>Folder</th>
                            <th>Hosts</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map(p => (
                            <tr key={p.id}>
                                    <td>{p.id}</td>
                                    <td>{p.name}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded border border-gray-300"
                                                style={{ backgroundColor: p.color }}
                                            ></div>
                                            {p.color}
                                        </div>
                                    </td>
                                    <td>{p.folder}</td>
                                    <td>
                                        {p.hosts.map((h, idx) => (
                                            <span key={idx} className="border border-gray-300 rounded px-2 py-0.5 mr-1 inline-block">
                                                {h}
                                            </span>
                                        ))}
                                    </td>
                                    <td>
                                        <Link
                                            to={`/projects/${p.id}/files`}
                                            className="bg-gray-500 text-white px-3 py-1.5 rounded border-none cursor-pointer mr-2"
                                        >
                                            Files
                                        </Link>
                                        <button
                                            onClick={() => onEdit(p)}
                                            className="bg-blue-500 text-white px-3 py-1.5 rounded border-none cursor-pointer mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="bg-red-600 text-white px-3 py-1.5 rounded border-none cursor-pointer"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </>
    );
};

export default ProjectList;