import React, { useState, useEffect } from 'react';
import { getProjects, sendAssistantPrompt, Project } from '../services/api';

const Assistant: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const projectList = await getProjects();
                setProjects(projectList);
                if (projectList.length > 0) {
                    setSelectedProjectId(projectList[0].id);
                }
            } catch (err) {
                setError('Failed to load projects');
            }
        };
        fetchProjects();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProjectId) {
            setError('Please select a project');
            return;
        }

        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const result = await sendAssistantPrompt(prompt, selectedProjectId);
            setResponse(result.response);
        } catch (err: any) {
            setError(err.message || 'Failed to get response from Assistant');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">AI Assistant</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Project Selection */}
                <div>
                    <label htmlFor="project" className="block text-sm font-medium mb-2">
                        Select Project
                    </label>
                    <select
                        id="project"
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                        className="w-full p-2 border rounded-md"
                        disabled={loading}
                    >
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Prompt Input */}
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                        Your Prompt
                    </label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask the AI to help with your project files..."
                        rows={6}
                        className="w-full p-2 border rounded-md font-mono"
                        disabled={loading}
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !selectedProjectId}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : 'Just do it!'}
                </button>
            </form>

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Response Display */}
            {response && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-3">Response</h2>
                    <div className="p-4 bg-gray-50 border rounded-md">
                        <pre className="whitespace-pre-wrap font-mono text-sm">{response}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assistant;
