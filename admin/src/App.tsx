import './App.css';
import { useState } from 'react';
import ProjectForm from './components/ProjectForm';
import ProjectList from './components/ProjectList';
import { Project } from './services/api';

function App() {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
  };

  const handleSuccess = () => {
    // Refresh the project list
    setRefreshTrigger(prev => prev + 1);
    // Clear the editing state
    setEditingProject(null);
  };

  const handleCancel = () => {
    setEditingProject(null);
  };

  return (
    <div className="App">
      <h1>SnapDash</h1>
      <ProjectForm
        project={editingProject}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
      <ProjectList
        onEdit={handleEdit}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

export default App;
