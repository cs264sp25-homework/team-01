import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all notes for the authenticated user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }



    const userId = identity.tokenIdentifier.split("|")[1];
    
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    return notes;
  },
});

// Get a specific note by ID
export const get = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.tokenIdentifier.split("|")[1];
    
    const note = await ctx.db.get(args.id);
    
    if (!note) {
      return null;
    }
    
    if (note.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    return note;
  },
});

// Create a new note
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Extract the stable part of the tokenIdentifier
    const userId = identity.tokenIdentifier.split("|")[1];
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
export const update = mutation({
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

    const userId = identity.tokenIdentifier.split("|")[1];
    
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
export const remove = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.tokenIdentifier.split("|")[1];
    
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

// Rename a note without updating the timestamp
export const rename = mutation({
  args: {
    id: v.id("notes"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.tokenIdentifier.split("|")[1];
    
    const existingNote = await ctx.db.get(args.id);
    
    if (!existingNote) {
      throw new Error("Note not found");
    }
    
    if (existingNote.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(args.id, {
      title: args.title,
    });
    
    return args.id;
  },
}); 