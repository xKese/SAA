import express from "express";
import cors from "cors";
import { ratelimit } from "./config";
import { registerRoutes } from "./routes";

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(ratelimit);

// Register routes
registerRoutes(app);

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple server running on port ${port}`);
});