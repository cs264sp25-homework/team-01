import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new note
export const createNote = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    const now = Date.now();
    
    const noteId = await ctx.db.insert("notes", {
      title: args.title,
      content: args.content,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    
    return noteId;
  },
});

// Update an existing note
export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    
    const existingNote = await ctx.db.get(args.id);
    
    if (!existingNote) {
      throw new Error("Note not found");
    }
    
    if (existingNote.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const now = Date.now();
    
    await ctx.db.patch(args.id, {
      title: args.title,
      content: args.content,
      updatedAt: now,
    });
    
    return args.id;
  },
});

// Delete a note
export const deleteNote = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    
    const existingNote = await ctx.db.get(args.id);
    
    if (!existingNote) {
      throw new Error("Note not found");
    }
    
    if (existingNote.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
    
    return args.id;
  },
});