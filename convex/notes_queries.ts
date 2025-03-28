import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all notes for the authenticated user
export const getNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    return notes;
  },
});

// Get a specific note by ID
export const getNote = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    
    const note = await ctx.db.get(args.id);
    
    if (!note) {
      throw new Error("Note not found");
    }
    
    if (note.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    return note;
  },
});