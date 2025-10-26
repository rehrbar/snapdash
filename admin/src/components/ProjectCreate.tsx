import config from "../config";
import React from "react";


const addProject = (name: string, color: string, hosts: string[]) => {
    fetch(`${config.baseUrl}/api/projects`, {
        method: 'POST', headers: {
            'Content-Type': 'application/json'
        }, body: JSON.stringify({ name, color, hosts })
    });
}

const ProjectCreate: React.FC<{}> = () => {
    const submit = (formData:FormData) => {
        // TODO add validation
        addProject(formData.get('name')?.toString() || '', formData.get('color')?.toString() || '', [formData.get('host')?.toString() || '']);
    }

    return (
        <div>
            <h1>Create Project</h1>
            <form action={submit}>
                <input type="text" name="name" placeholder="Name" />
                <input type="text" name="color" placeholder="#445544" />
                <input type="text" name="host" placeholder="my-proj.example.com" />
                <button type="submit">Create</button>
            </form>
        </div>
    )
}

export default ProjectCreate;