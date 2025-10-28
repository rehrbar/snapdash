import { useEffect, useState } from "react";
import { getProjectFiles, ProjectFilesResponse, getFileContent, updateFileContent, deleteFile } from "../services/api";
import React from "react";
import { useParams } from "react-router";


const FileList: React.FC<{}> = () => {
    const { id } = useParams();
    const projectId = Number.parseInt(id || '');
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<ProjectFilesResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // File content states
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [editedFileName, setEditedFileName] = useState<string>("");
    const [fileContent, setFileContent] = useState<string>("");
    const [editedContent, setEditedContent] = useState<string>("");
    const [loadingContent, setLoadingContent] = useState(false);
    const [contentError, setContentError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProjectFiles(projectId);
            setFiles(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    // TODO fix this eslint warning
    useEffect(() => {
        loadFiles();
    }, [projectId]);

    const handleFileSelect = async (filePath: string) => {
        setSelectedFile(filePath);
        setEditedFileName(filePath);
        setLoadingContent(true);
        setContentError(null);
        setSaveSuccess(false);

        try {
            const data = await getFileContent(projectId, filePath);
            setFileContent(data.content);
            setEditedContent(data.content);
        } catch (err) {
            setContentError(err instanceof Error ? err.message : 'Failed to load file content');
        } finally {
            setLoadingContent(false);
        }
    };

    const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedFileName(e.target.value);
        setSaveSuccess(false);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedContent(e.target.value);
        setSaveSuccess(false);
    };

    const handleSave = async () => {
        if (!editedFileName) return;

        setIsSaving(true);
        setContentError(null);
        setSaveSuccess(false);

        try {
            // Save to the edited filename (could be same as original or new)
            await updateFileContent(projectId, editedFileName, editedContent);
            setFileContent(editedContent);

            // If filename changed, switch to editing the new file
            if (editedFileName !== selectedFile) {
                setSelectedFile(editedFileName);
                // Refresh file list to show the new file
                await loadFiles();
            }

            setSaveSuccess(true);
        } catch (err) {
            setContentError(err instanceof Error ? err.message : 'Failed to save file');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedFile) return;

        if (!window.confirm(`Are you sure you want to delete "${selectedFile}"? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        setContentError(null);
        setSaveSuccess(false);

        try {
            await deleteFile(projectId, selectedFile);
            // Clear the editor
            setSelectedFile(null);
            setFileContent("");
            setEditedContent("");
            // Refresh the file list
            await loadFiles();
        } catch (err) {
            setContentError(err instanceof Error ? err.message : 'Failed to delete file');
        } finally {
            setIsDeleting(false);
        }
    };

    const isDirty = fileContent !== editedContent || editedFileName !== selectedFile;

    if(Number.isNaN(projectId)) {
        return <div className="text-red-600 p-4">Invalid project id: {id}</div>;
    }

    if (loading) {
        return <div className="text-gray-600 p-4">Loading files...</div>;
    }

    if (error) {
        return <div className="text-red-600 p-4">Error: {error}</div>;
    }

    if (!files || files.files.length === 0) {
        return <div className="text-gray-500 p-4">No files found in this project.</div>;
    }

    return (
        <div className="p-4">
            <div className="mb-4">
                <h2 className="text-xl font-bold">Files in {files.project}</h2>
                <p className="text-gray-600">{files.count} file{files.count !== 1 ? 's' : ''}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File List */}
                <div>
                    <h3 className="font-semibold mb-2">File List</h3>
                    <div className="max-h-96 overflow-y-auto bg-white border border-gray-300 rounded">
                        <ul className="list-none m-0 p-0">
                            {files.files.map((file, idx) => (
                                <li
                                    key={idx}
                                    className={`py-2 px-3 hover:bg-blue-100 font-mono text-sm cursor-pointer border-b border-gray-200 ${selectedFile === file ? 'bg-blue-200' : ''}`}
                                    onClick={() => handleFileSelect(file)}
                                >
                                    {file}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* File Content Editor */}
                <div>
                    <h3 className="font-semibold mb-2">
                        {selectedFile ? 'File Editor' : 'Select a file to edit'}
                    </h3>

                    {loadingContent && (
                        <div className="text-gray-600 p-4">Loading file content...</div>
                    )}

                    {contentError && (
                        <div className="text-red-600 p-4 bg-red-50 border border-red-200 rounded mb-2">
                            Error: {contentError}
                        </div>
                    )}

                    {saveSuccess && (
                        <div className="text-green-600 p-4 bg-green-50 border border-green-200 rounded mb-2">
                            File saved successfully!
                        </div>
                    )}

                    {selectedFile && !loadingContent && (
                        <div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">File Name:</label>
                                <input
                                    type="text"
                                    value={editedFileName}
                                    onChange={handleFileNameChange}
                                    className="w-full p-2 font-mono text-sm border border-gray-300 rounded"
                                    placeholder="Enter filename"
                                />
                                {editedFileName !== selectedFile && (
                                    <p className="text-sm text-blue-600 mt-1">
                                        Will save as a new file (original file will be kept)
                                    </p>
                                )}
                            </div>
                            <textarea
                                value={editedContent}
                                onChange={handleContentChange}
                                className="w-full h-64 p-3 font-mono text-sm border border-gray-300 rounded resize-none"
                                spellCheck={false}
                            />
                            <div className="mt-2 flex gap-2 items-center">
                                <button
                                    onClick={handleSave}
                                    disabled={!isDirty || isSaving || isDeleting}
                                    className={`px-4 py-2 rounded ${
                                        isDirty && !isSaving && !isDeleting
                                            ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting || isSaving}
                                    className={`px-4 py-2 rounded ${
                                        !isDeleting && !isSaving
                                            ? 'bg-red-600 text-white cursor-pointer hover:bg-red-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete File'}
                                </button>
                                {isDirty && (
                                    <span className="text-orange-600 text-sm">Unsaved changes</span>
                                )}
                            </div>
                        </div>
                    )}

                    {!selectedFile && !loadingContent && (
                        <div className="text-gray-500 p-4 bg-gray-50 border border-gray-300 rounded">
                            Click on a file from the list to view and edit its contents.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileList;
