import './App.css';
import ProjectCreate from './components/ProjectCreate';
import ProjectList from './components/ProjectList';

function App() {
  return (
    <div className="App">
      SnapDash
      <ProjectList />
      <ProjectCreate />
    </div>
  );
}

export default App;
