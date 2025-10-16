import express, { Request, Response } from "express";
import { tenantResolver } from "./middleware/tenantResolver";
import { fileLoader } from "./middleware/fileLoader";

// Create a new express application instance
const app = express();

// Set the network port
const port = process.env.PORT || 3000;

// Apply tenant resolution middleware globally
app.use(tenantResolver);

// Apply file loader middleware to serve files from tenant folders
app.use(fileLoader);

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});