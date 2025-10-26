import React, { useState, useEffect } from "react";
import { createProject, updateProject, Project } from "../services/api";

interface ProjectFormProps {
    project?: Project | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSuccess, onCancel }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [hosts, setHosts] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditMode = !!project;

    // Populate form when editing
    useEffect(() => {
        if (project) {
            setName(project.name);
            setColor(project.color);
            setHosts(project.hosts.length > 0 ? project.hosts : ['']);
        } else {
            setName('');
            setColor('');
            setHosts(['']);
        }
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Filter out empty hosts
        const validHosts = hosts.filter(h => h.trim() !== '');

        if (validHosts.length === 0) {
            setError('At least one host is required');
            setLoading(false);
            return;
        }

        try {
            const projectData = {
                name,
                color,
                hosts: validHosts
            };

            if (isEditMode) {
                await updateProject(project.id, projectData);
            } else {
                await createProject(projectData);
            }

            // Reset form
            setName('');
            setColor('');
            setHosts(['']);

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setName('');
        setColor('');
        setHosts(['']);
        setError(null);
        if (onCancel) {
            onCancel();
        }
    };

    const handleHostChange = (index: number, value: string) => {
        const newHosts = [...hosts];
        newHosts[index] = value;
        setHosts(newHosts);
    };

    const handleAddHost = () => {
        setHosts([...hosts, '']);
    };

    const handleRemoveHost = (index: number) => {
        if (hosts.length > 1) {
            const newHosts = hosts.filter((_, i) => i !== index);
            setHosts(newHosts);
        }
    };

    return (
        <div className="border p-4 mb-4 rounded">
            <h1>{isEditMode ? 'Edit Project' : 'Create Project'}</h1>
            {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block mb-2">
                        <strong>Name:</strong>
                    </label>
                    <input
                        type="text"
                        name="name"
                        placeholder="Project Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="border p-2 rounded w-full"
                    />
                </div>

                <div className="mb-4">
                    <label className="block mb-2">
                        <strong>Color:</strong>
                    </label>
                    <input
                        type="text"
                        name="color"
                        placeholder="#445544"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        required
                        className="border p-2 rounded w-full"
                    />
                </div>

                <div className="mb-4">
                    <label className="block mb-2">
                        <strong>Hosts:</strong>
                    </label>
                    {hosts.map((host, index) => (
                        <div key={index} className="flex mb-2">
                            <input
                                type="text"
                                placeholder="my-proj.example.com"
                                value={host}
                                onChange={(e) => handleHostChange(index, e.target.value)}
                                className="border p-2 rounded flex-1 mr-2"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveHost(index)}
                                disabled={hosts.length === 1}
                                className="bg-red-500 text-white px-3 py-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddHost}
                        className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                    >
                        Add Host
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
                    >
                        {loading ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
                    </button>
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="bg-gray-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ProjectForm;
