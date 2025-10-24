import express, { Request, Response } from "express";
import { tenantResolver } from "./middleware/tenantResolver";
import { fileLoader } from "./middleware/fileLoader";
import { tenantsRouter } from "./api/tenants";
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
app.use("/api", tenantsRouter);

// Apply tenant resolution middleware globally
app.use(tenantResolver);

// Apply file loader middleware to serve files from tenant folders
app.use(fileLoader);

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});