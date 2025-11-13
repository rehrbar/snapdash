import express, { Request, Response } from "express";
import { projectResolver } from "./middleware/projectResolver.js";
import { fileLoader } from "./middleware/fileLoader.js";
import { projectsRouter } from "./api/projects.js";
import { assistantRouter } from "./api/assistant.js";
import { initializeDatabase, seedDatabase, waitForDatabase } from "./db/database.js";
import { initializeBucket, waitForS3 } from "./services/fileAccessService.js";

// Async initialization function
async function startServer() {
    await waitForDatabase();
    // Initialize database
    await initializeDatabase();
    await seedDatabase();

    // Initialize storage
    await waitForS3();
    await initializeBucket();

    // Create a new express application instance
    const app = express();

    // Set the network port
    const port = process.env.PORT || 3001;

    // Add JSON body parser middleware
    app.use(express.json());

    // Mount API routes
    app.use("/api", projectsRouter);
    app.use("/api", assistantRouter);

    // Apply project resolution middleware globally
    app.use(projectResolver);

    // Apply file loader middleware to serve files from project folders
    app.use(fileLoader);

    // Start the Express server
    app.listen(port, () => {
        console.log(`The server is running at http://localhost:${port}`);
    });
}

// Start the server
startServer().catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
});