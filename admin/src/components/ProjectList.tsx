import { useEffect, useState } from "react";
import config from "../config";
import React from "react";

interface Project {
    id: number,
    name: string,
    color: string,
    folder: string,
    hosts: string[]
}

const deleteProject = (id: number) => {
    fetch(`${config.baseUrl}/api/projects/${id}`, {
        method: 'DELETE'
    });
}

const ProjectList: React.FC<{}> = () => {

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        fetch(`${config.baseUrl}/api/projects`)
            .then(r => {
                return r.json();
            })
            .then(data => setProjects(data['projects']))
            .finally(() => setLoading(false));
    }, []);


    return (
        <>
            <h1>Projects</h1>
            {loading && <span>Loading</span>}
            {projects.map(p => <div className="flex flex-col">
                <span>{p.id}</span>
                <span>{p.name}</span>
                <span>{p.color}</span>
                <span>{p.folder}</span>
                <span>
                    Hosts:
                    {p.hosts.map(h => <span className="border rounded px-2">{h}</span>)}

                </span>
                <button className="bg-rose-600" onClick={() => {deleteProject(p.id)}}>Delete {p.id}</button>
            </div>)}
        </>
    );
}

export default ProjectList;