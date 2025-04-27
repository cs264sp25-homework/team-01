import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// Get a concept map for a specific note
export const getConceptMap = query({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get the concept map for the note
    const conceptMap = await ctx.db
      .query("conceptMaps")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .first();
    
    return conceptMap;
  },
});

// Define the node and edge types to match ReactFlow's structure
const nodeSchema = v.object({
  id: v.string(),
  type: v.optional(v.string()),
  position: v.object({
    x: v.number(),
    y: v.number(),
  }),
  data: v.object({
    label: v.string(),
  }),
  // Allow for additional properties
  [v.union(v.literal("style"), v.literal("width"), v.literal("height"))]: v.any(),
});

const edgeSchema = v.object({
  id: v.string(),
  source: v.string(),
  target: v.string(),
  type: v.optional(v.string()),
  data: v.optional(v.object({
    label: v.optional(v.string()),
  })),
  // Allow for additional properties
  [v.union(v.literal("style"), v.literal("markerEnd"), v.literal("labelStyle"))]: v.any(),
});

// Store a concept map for a note
export const storeConceptMap = mutation({
  args: {
    nodes: v.array(nodeSchema),
    edges: v.array(edgeSchema),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Check if a concept map already exists for this note
    const existingMap = await ctx.db
      .query("conceptMaps")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .first();
    
    const now = Date.now();
    
    // Prepare the nodes and edges for storage
    const sanitizedNodes = args.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.data.label,
      },
    }));

    const sanitizedEdges = args.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: {
        label: edge.data?.label,
      },
    }));
    
    if (existingMap) {
      // Update the existing concept map
      await ctx.db.patch(existingMap._id, {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
        updatedAt: now,
      });
      
      return existingMap._id;
    } else {
      // Create a new concept map
      const conceptMapId = await ctx.db.insert("conceptMaps", {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
        userId,
        noteId: args.noteId,
        createdAt: now,
        updatedAt: now,
      });
      
      return conceptMapId;
    }
  },
});

// Delete a concept map for a note
export const deleteConceptMap = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Find the concept map
    const conceptMap = await ctx.db
      .query("conceptMaps")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .first();
    
    if (!conceptMap) {
      return { deleted: false };
    }
    
    // Delete the concept map
    await ctx.db.delete(conceptMap._id);
    
    return { deleted: true };
  },
});
