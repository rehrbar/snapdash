import express, { Request, Response } from "express";
import { projectResolver } from "./middleware/projectResolver.js";
import { fileLoader } from "./middleware/fileLoader.js";
import { projectsRouter } from "./api/projects.js";
import { initializeDatabase, seedDatabase, waitForDatabase } from "./db/database.js";

// Async initialization function
async function startServer() {
    await waitForDatabase();
    // Initialize database
    await initializeDatabase();
    await seedDatabase();

    // Create a new express application instance
    const app = express();

    // Set the network port
    const port = process.env.PORT || 3001;

    // Add JSON body parser middleware
    app.use(express.json());

    // Mount API routes
    app.use("/api", projectsRouter);

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