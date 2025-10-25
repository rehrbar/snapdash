import express, { Request, Response } from "express";
import { projectResolver } from "./middleware/projectResolver";
import { fileLoader } from "./middleware/fileLoader";
import { projectsRouter } from "./api/projects";
import { initializeDatabase, seedDatabase } from "./db/database";

// Initialize database
initializeDatabase();
seedDatabase();

// Create a new express application instance
const app = express();

// Set the network port
const port = process.env.PORT || 3000;

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