// server.js - Express server implementation
// Load environment variables from .env file
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { prisma, connectToDatabase } from "./prisma.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to the database
connectToDatabase().catch(console.error);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      message: "Database is connected and operational",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      message: "Database connection issue",
      error: error.message,
    });
  }
});

// API Routes
// Get all inventory items
app.get("/api/inventory", async (req, res) => {
  try {
    const { includeLinks } = req.query;

    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: "asc" },
      include:
        includeLinks === "true"
          ? {
              linkedToItems: true,
              linkedFromItems: true,
            }
          : undefined,
    });
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    res.status(500).json({ error: "Failed to fetch inventory items" });
  }
});

// Get a specific inventory item by ID
app.get("/api/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        linkedToItems: true,
        linkedFromItems: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    res.status(500).json({ error: "Failed to fetch inventory item" });
  }
});

// Create a new inventory item
app.post("/api/inventory", async (req, res) => {
  try {
    const { name, type, ipAddress } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name,
        type,
        ipAddress,
      },
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ error: "Failed to create inventory item" });
  }
});

// Update an existing inventory item
app.put("/api/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, ipAddress } = req.body;

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name,
        type,
        ipAddress,
      },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ error: "Failed to update inventory item" });
  }
});

// Delete an inventory item
app.delete("/api/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.inventoryItem.delete({
      where: { id },
    });

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ error: "Failed to delete inventory item" });
  }
});

// Get linked items for a specific inventory item
app.get("/api/inventory/:id/links", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        linkedToItems: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item.linkedToItems);
  } catch (error) {
    console.error("Error fetching linked items:", error);
    res.status(500).json({ error: "Failed to fetch linked items" });
  }
});

// Add a link between two inventory items
app.post("/api/inventory/:id/links", async (req, res) => {
  try {
    const { id } = req.params;
    const { linkedItemId } = req.body;

    if (!linkedItemId) {
      return res.status(400).json({ error: "Linked item ID is required" });
    }

    // Check if both items exist
    const sourceItem = await prisma.inventoryItem.findUnique({ where: { id } });
    const targetItem = await prisma.inventoryItem.findUnique({
      where: { id: linkedItemId },
    });

    if (!sourceItem || !targetItem) {
      return res.status(404).json({ error: "One or both items not found" });
    }

    // Add the link
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        linkedToItems: {
          connect: { id: linkedItemId },
        },
      },
      include: {
        linkedToItems: true,
      },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Error linking items:", error);
    res.status(500).json({ error: "Failed to link items" });
  }
});

// Remove a link between two inventory items
app.delete("/api/inventory/:id/links/:linkedItemId", async (req, res) => {
  try {
    const { id, linkedItemId } = req.params;

    // Check if both items exist
    const sourceItem = await prisma.inventoryItem.findUnique({ where: { id } });
    const targetItem = await prisma.inventoryItem.findUnique({
      where: { id: linkedItemId },
    });

    if (!sourceItem || !targetItem) {
      return res.status(404).json({ error: "One or both items not found" });
    }

    // Remove the link
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        linkedToItems: {
          disconnect: { id: linkedItemId },
        },
      },
    });

    res.json({ message: "Link removed successfully" });
  } catch (error) {
    console.error("Error removing link between items:", error);
    res.status(500).json({ error: "Failed to remove link between items" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
