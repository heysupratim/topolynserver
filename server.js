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
      include: {
        services: true,
        ...(includeLinks === "true"
          ? {
              outgoingLinks: {
                include: {
                  targetItem: true,
                },
              },
              incomingLinks: {
                include: {
                  sourceItem: true,
                },
              },
            }
          : {}),
      },
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
        services: true,
        outgoingLinks: {
          include: {
            targetItem: true,
          },
        },
        incomingLinks: {
          include: {
            sourceItem: true,
          },
        },
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
    const { name, type, ipAddress, services } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name,
        type,
        ipAddress,
        services: services
          ? {
              create: services.map((service) => ({
                name: service.name,
                imageUrl: service.imageUrl,
              })),
            }
          : undefined,
      },
      include: {
        services: true,
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
      include: {
        services: true,
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

// Get all services for an inventory item
app.get("/api/inventory/:id/services", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        services: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item.services);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// Add a service to an inventory item
app.post("/api/inventory/:id/services", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Service name is required" });
    }

    // Check if the item exists
    const item = await prisma.inventoryItem.findUnique({ where: { id } });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const newService = await prisma.service.create({
      data: {
        name,
        imageUrl,
        inventoryItem: {
          connect: { id },
        },
      },
    });

    res.status(201).json(newService);
  } catch (error) {
    console.error("Error adding service:", error);
    res.status(500).json({ error: "Failed to add service" });
  }
});

// Update a service
app.put("/api/inventory/:id/services/:serviceId", async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const { name, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Service name is required" });
    }

    // Check if the service belongs to the specified item
    const existingService = await prisma.service.findFirst({
      where: {
        id: serviceId,
        inventoryItemId: id,
      },
    });

    if (!existingService) {
      return res.status(404).json({ error: "Service not found" });
    }

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name,
        imageUrl,
      },
    });

    res.json(updatedService);
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ error: "Failed to update service" });
  }
});

// Delete a service from an inventory item
app.delete("/api/inventory/:id/services/:serviceId", async (req, res) => {
  try {
    const { id, serviceId } = req.params;

    // Check if the service belongs to the specified item
    const existingService = await prisma.service.findFirst({
      where: {
        id: serviceId,
        inventoryItemId: id,
      },
    });

    if (!existingService) {
      return res.status(404).json({ error: "Service not found" });
    }

    await prisma.service.delete({
      where: { id: serviceId },
    });

    res.json({ message: "Service removed successfully" });
  } catch (error) {
    console.error("Error removing service:", error);
    res.status(500).json({ error: "Failed to remove service" });
  }
});

// Get links for a specific inventory item
app.get("/api/inventory/:id/links", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        outgoingLinks: {
          include: {
            targetItem: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Format the response to include link type, port, and target item details
    const links = item.outgoingLinks.map((link) => ({
      id: link.id,
      linkType: link.linkType,
      port: link.port, // Include the optional port field in the response
      targetItem: link.targetItem,
    }));

    res.json(links);
  } catch (error) {
    console.error("Error fetching linked items:", error);
    res.status(500).json({ error: "Failed to fetch linked items" });
  }
});

// Add a link between two inventory items
app.post("/api/inventory/:id/links", async (req, res) => {
  try {
    const { id } = req.params;
    const { linkedItemId, linkType, port } = req.body;

    if (!linkedItemId) {
      return res.status(400).json({ error: "Linked item ID is required" });
    }

    if (!linkType) {
      return res.status(400).json({ error: "Link type is required" });
    }

    // Check if both items exist
    const sourceItem = await prisma.inventoryItem.findUnique({ where: { id } });
    const targetItem = await prisma.inventoryItem.findUnique({
      where: { id: linkedItemId },
    });

    if (!sourceItem || !targetItem) {
      return res.status(404).json({ error: "One or both items not found" });
    }

    // Check if the link already exists
    const existingLink = await prisma.itemLink.findFirst({
      where: {
        sourceItemId: id,
        targetItemId: linkedItemId,
      },
    });

    if (existingLink) {
      return res.status(409).json({
        error: "Link already exists",
        link: existingLink,
      });
    }

    // Create the link with the specified type and optional port
    const newLink = await prisma.itemLink.create({
      data: {
        linkType,
        port, // Include the optional port field
        sourceItem: {
          connect: { id },
        },
        targetItem: {
          connect: { id: linkedItemId },
        },
      },
      include: {
        targetItem: true,
      },
    });

    res.status(201).json(newLink);
  } catch (error) {
    console.error("Error linking items:", error);
    res.status(500).json({ error: "Failed to link items" });
  }
});

// Update a link between two inventory items
app.put("/api/inventory/:id/links/:linkId", async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const { linkType, port } = req.body;

    if (!linkType) {
      return res.status(400).json({ error: "Link type is required" });
    }

    // Check if the link exists and belongs to the source item
    const existingLink = await prisma.itemLink.findFirst({
      where: {
        id: linkId,
        sourceItemId: id,
      },
    });

    if (!existingLink) {
      return res.status(404).json({ error: "Link not found" });
    }

    // Update the link type and optional port
    const updatedLink = await prisma.itemLink.update({
      where: { id: linkId },
      data: {
        linkType,
        port, // Include the optional port field
      },
      include: {
        targetItem: true,
      },
    });

    res.json(updatedLink);
  } catch (error) {
    console.error("Error updating link:", error);
    res.status(500).json({ error: "Failed to update link" });
  }
});

// Remove a link between two inventory items
app.delete("/api/inventory/:id/links/:linkId", async (req, res) => {
  try {
    const { id, linkId } = req.params;

    // Check if the link exists and belongs to the source item
    const existingLink = await prisma.itemLink.findFirst({
      where: {
        id: linkId,
        sourceItemId: id,
      },
    });

    if (!existingLink) {
      return res.status(404).json({ error: "Link not found" });
    }

    // Delete the link
    await prisma.itemLink.delete({
      where: { id: linkId },
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
