import express, { Request, Response } from "express";
import { projectResolver } from "./middleware/projectResolver.js";
import { fileLoader } from "./middleware/fileLoader.js";
import { projectsRouter } from "./api/projects.js";
import { initializeDatabase, seedDatabase } from "./db/database.js";

// Initialize database
initializeDatabase();
seedDatabase();

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