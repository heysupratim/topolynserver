import { PrismaClient } from "./generated/prisma/index.js";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Helper to ensure proper connection and error handling
async function connectToDatabase() {
  try {
    // Check if database file exists
    const dbPath = path.resolve(__dirname, "./dev.db");
    const dbExists = fs.existsSync(dbPath);

    if (!dbExists) {
      console.log(
        "Database file doesn't exist. Running migrations to create it..."
      );
      try {
        // Run prisma migrations to create the database
        execSync("npx prisma migrate dev --name init", { stdio: "inherit" });
        console.log("Database created successfully through migrations.");
      } catch (migrationError) {
        console.error("Failed to run migrations:", migrationError);
        throw migrationError;
      }
    }

    await prisma.$connect();
    console.log("Successfully connected to the database");
    return prisma;
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

// Export using ES modules syntax
export { prisma, connectToDatabase };
