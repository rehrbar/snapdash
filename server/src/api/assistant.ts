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
    instructions: `You are a helpful AI assistant that can help manage files in a web project.

When working with files:
- Always list files first if you need to understand the project structure.
- Read files before modifying them to understand their current content.
- Be careful when updating files - make sure your changes are correct.
- No explanations on changes are required.

Respond helpfully and concisely to user requests.`,
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
