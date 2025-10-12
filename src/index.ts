import express, { Request, Response } from "express";
import { tenantResolver } from "./middleware/tenantResolver";

// Create a new express application instance
const app = express();

// Set the network port
const port = process.env.PORT || 3000;

// Apply tenant resolution middleware globally
app.use(tenantResolver);

// Define the root path with a greeting message
app.get("/", (req: Request, res: Response) => {
    res.json({
        message: "Welcome to the Express + TypeScript Server!",
        currentTenant: req.tenant || null
    });
});

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});