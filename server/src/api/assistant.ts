import { Router, Request, Response, response } from "express";
import { z } from "zod";
import { Agent, run, RunContext, tool} from "@openai/agents";
import * as projectService from "../db/projectService.js";
import * as fileAccessService from "../services/fileAccessService.js";
import cors from "cors";
import { Project } from "../db/projects.js";

// Create a new router for Assistant API endpoints
export const assistantRouter = Router();

assistantRouter.use(cors());

// Zod schema for Assistant request
const assistantRequestSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    projectId: z.number().int().positive("Project ID must be a positive integer")
});

interface ToolContext {
    project: Project;
}

const listFilesTool = tool({
    name:"list_files",
    description: "List all files in the project. Use this tool first to ensure to provide a valid path when editing a file.",
    parameters: z.object({}),
    execute: async (input, context?: RunContext<ToolContext>) => {
        console.log('calling tool list_files');
        const project = context?.context.project;

        if (!project) {
            throw new Error("No project provided");
        }
        return (await fileAccessService.listFiles(project)).join("\n");
    }
});

const readFileTool = tool({
    name: "read_file",
    description: "Read the contents of a specific file.",
    parameters: z.object({path: z.string() }),
    execute: async ({path}, context?: RunContext<ToolContext>) => {
        console.log('calling tool read_file');
        const project = context?.context.project;
        if (!project) {
            throw new Error("No project provided");
        }
        return (await fileAccessService.readFile(project, path)).toString();
    }
});

const writeFileTool = tool({
    name: "write_file",
    description: "Write the contents of a specific file. If the file exists, the content will be overwritten.",
    parameters: z.object({path: z.string(), content: z.string() }),
    execute: async ({path, content}, context?: RunContext<ToolContext>) => {
        console.log('calling tool write_file');
        const project = context?.context.project;
        if (!project) {
            throw new Error("No project provided");
            }
        await fileAccessService.writeFile(project, path, content);
    }
})

// Initialize OpenAI agent
const agent = new Agent<ToolContext>({
    name: "Snapdash Coder",
    instructions: `You are a helpful AI assistant that manages files in web projects.

Tool Usage:
- List files when you need to discover paths or understand project structure
- Read files before modifying them to understand current content
- Validate file paths exist before attempting to write

Error Handling:
- If any tool operation fails, immediately report the error and stop processing
- Never ask users to manually copy/paste files or perform manual operations
- Report what failed clearly: "Failed to read 'style.css': File not found"
- Do not attempt workarounds after failures

Communication Style:
- Be concise and action-oriented
- Only explain changes if the user asks or if there are important caveats
- Report what you did after completing actions

Layout System (_layout.html):
- The layout system ONLY applies to HTML files (*.html)
- Create '_layout.html' to define common HTML structure (navigation, footer, head)
- HTML files are automatically wrapped with _layout.html if it exists
- CSS, JavaScript, images, and other file types are NOT affected by the layout system
- Use {{content}} as the placeholder where page content will be injected
- Available placeholders in _layout.html:
  - {{name}} - Project name
  - {{color}} - Project color (hex format, e.g., #07b379ff)
  - {{folder}} - Project folder identifier

Example _layout.html:
  <!DOCTYPE html>
  <html>
  <head>
    <title>{{name}}</title>
    <link rel="stylesheet" href="style.css">
    <style>
      :root { --theme-color: {{color}}; }
    </style>
  </head>
  <body>
    <nav><!-- common navigation --></nav>
    {{content}}
  </body>
  </html>

Project Structure:
- Project root is the web root
- index.html serves as the default homepage
- Use relative paths for assets (./style.css, ./script.js, ./images/logo.png)
- Common structure: index.html, style.css, script.js, images/, etc.

Asset Files:
- CSS files: Standard stylesheets, reference with <link rel="stylesheet" href="style.css">
- JS files: Standard scripts, include with <script src="script.js"></script>
- Images/fonts: Can be placed in subdirectories and referenced normally
- These files are served as-is, NOT wrapped with any layout`,
    model: "gpt-5-nano",
    tools: [listFilesTool, readFileTool, writeFileTool]
});

/**
 * POST /api/assistant
 * Send a prompt to the Assistant with file management tools
 */
assistantRouter.post("/assistant", async (req: Request, res: Response) => {
    try {
        // Validate request body
        const validationResult = assistantRequestSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                error: "Validation failed",
                details: validationResult.error.issues
            });
            return;
        }

        const { prompt, projectId } = validationResult.data;

        // Get the project
        const project = await projectService.findProjectById(projectId);
        if (!project) {
            res.status(404).json({
                error: "Project not found"
            });
            return;
        }
        const result = await run(agent, prompt, {context: {project}})

        // Return the final response
        res.json({
            response: result.finalOutput,
            project: project.name,
        });

    } catch (error: any) {
        console.error("Error processing LLM request:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error.message
        });
    }
});
