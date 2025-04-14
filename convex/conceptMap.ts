import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// Get a concept map for a specific note
export const getConceptMap = query({
  args: {
    noteId: v.string(),
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

// Store a concept map for a note
export const storeConceptMap = mutation({
  args: {
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Check if a concept map already exists for this note
    const existingMap = await ctx.db
      .query("conceptMaps")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .first();
    
    const now = Date.now();
    
    if (existingMap) {
      // Update the existing concept map
      await ctx.db.patch(existingMap._id, {
        nodes: args.nodes,
        edges: args.edges,
        updatedAt: now,
      });
      
      return existingMap._id;
    } else {
      // Create a new concept map
      const conceptMapId = await ctx.db.insert("conceptMaps", {
        nodes: args.nodes,
        edges: args.edges,
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
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
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
