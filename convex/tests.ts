import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new test
export const create = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    questions: v.array(
      v.object({
        type: v.string(),
        question: v.string(),
        options: v.optional(v.array(v.string())),
        answer: v.string(),
        source: v.optional(v.string()),
      })
    ),
    settings: v.object({
      numQuestions: v.number(),
      types: v.array(v.string()),
      difficulty: v.string(),
      sections: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Verify the note exists and belongs to the user
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or access denied");
    }
    
    // Create the test
    const testId = await ctx.db.insert("tests", {
      userId,
      noteId: args.noteId,
      title: args.title || `Test for ${note.title}`,
      questions: args.questions,
      createdAt: Date.now(),
      settings: args.settings,
    });
    
    return testId;
  },
});

// Get a specific test by ID
export const get = query({
  args: {
    id: v.id("tests"),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get the test
    const test = await ctx.db.get(args.id);
    
    // Check if the test exists and belongs to the user
    if (!test || test.userId !== userId) {
      return null;
    }
    
    return test;
  },
});

// Get all tests for a specific note
export const getByNote = query({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Query tests by note ID and user ID
    const tests = await ctx.db
      .query("tests")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .order("desc")
      .collect();
    
    return tests;
  },
});

// Get all tests for the current user
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Set a default limit or use the provided one
    const limit = args.limit || 100;
    
    // Query tests by user ID
    const tests = await ctx.db
      .query("tests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    
    return tests;
  },
});

// Define a type for the update object
type TestUpdate = {
  title?: string;
  questions?: Array<{
    type: string;
    question: string;
    options?: string[];
    answer: string;
    source?: string;
  }>;
  settings?: {
    numQuestions: number;
    types: string[];
    difficulty: string;
    sections: string[];
  };
};

// Update an existing test
export const update = mutation({
  args: {
    id: v.id("tests"),
    title: v.optional(v.string()),
    questions: v.optional(
      v.array(
        v.object({
          type: v.string(),
          question: v.string(),
          options: v.optional(v.array(v.string())),
          answer: v.string(),
          source: v.optional(v.string()),
        })
      )
    ),
    settings: v.optional(
      v.object({
        numQuestions: v.number(),
        types: v.array(v.string()),
        difficulty: v.string(),
        sections: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get the test
    const test = await ctx.db.get(args.id);
    
    // Check if the test exists and belongs to the user
    if (!test || test.userId !== userId) {
      throw new Error("Test not found or access denied");
    }
    
    // Prepare update object with only the fields that are provided
    const updateObj: TestUpdate = {};
    
    if (args.title !== undefined) {
      updateObj.title = args.title;
    }
    
    if (args.questions !== undefined) {
      updateObj.questions = args.questions;
    }
    
    if (args.settings !== undefined) {
      updateObj.settings = args.settings;
    }
    
    // Update the test
    await ctx.db.patch(args.id, updateObj);
    
    return args.id;
  },
});

// Delete a test
export const remove = mutation({
  args: {
    id: v.id("tests"),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get the test
    const test = await ctx.db.get(args.id);
    
    // Check if the test exists and belongs to the user
    if (!test || test.userId !== userId) {
      throw new Error("Test not found or access denied");
    }
    
    // Delete the test
    await ctx.db.delete(args.id);
    
    return true;
  },
});

// Delete all tests for a specific note
export const removeByNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Query tests by note ID and user ID
    const tests = await ctx.db
      .query("tests")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .collect();
    
    // Delete each test
    for (const test of tests) {
      await ctx.db.delete(test._id);
    }
    
    return tests.length;
  },
}); 