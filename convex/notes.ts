import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
    
    // Process the note to create chunks
    await ctx.scheduler.runAfter(0, internal.chunking.processNoteChunks, {
      noteId,
      content: args.content,
    });
    
    // Process the note to create embeddings
    await ctx.scheduler.runAfter(0, internal.embeddings.processNoteEmbeddings, {
      noteId,
    });
    
    return noteId;
  },
});

// Update lastEmbeddedAt timestamp
export const updateLastEmbedded = internalMutation({
  args: {
    noteId: v.id("notes"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      lastEmbeddedAt: args.timestamp,
    });
  },
});

// Force embed a note
export const forceEmbed = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.tokenIdentifier.split("|")[1];
    const note = await ctx.db.get(args.id);
    
    if (!note) {
      throw new Error("Note not found");
    }
    
    if (note.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Force process the content
    await ctx.runMutation(internal.embeddings.debouncedEmbedding.trackContentChange, {
      noteId: args.id,
      content: note.content,
      forceProcess: true,
    });
    
    return args.id;
  },
});

// Modify the update mutation to use debounced embedding
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

    // Use debounced embedding system
    await ctx.runMutation(internal.embeddings.debouncedEmbedding.trackContentChange, {
      noteId: args.id,
      content: args.content,
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

// Search notes by title and content
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier.split("|")[1];
    const searchTerm = args.query.toLowerCase();
    
    // Get all notes for the user
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Filter and process notes that match the search term
    return notes
      .filter(note => {
        const titleMatch = note.title.toLowerCase().includes(searchTerm);
        
        // Parse content if it exists and is a string
        let contentMatch = false;
        if (note.content && typeof note.content === 'string') {
          try {
            // Try to parse JSON content
            const parsedContent = JSON.parse(note.content);
            
            // Extract text from the content structure
            const extractedText = extractTextFromContent(parsedContent);
            contentMatch = extractedText.toLowerCase().includes(searchTerm);
          } catch (e) {
            // If parsing fails, try direct string matching
            contentMatch = note.content.toLowerCase().includes(searchTerm);
          }
        }
        
        return titleMatch || contentMatch;
      })
      .map(note => {
        // Add a content preview for matching notes
        let contentPreview = "";
        
        if (note.content && typeof note.content === 'string') {
          try {
            const parsedContent = JSON.parse(note.content);
            const extractedText = extractTextFromContent(parsedContent);
            
            // Find the context around the match
            const matchIndex = extractedText.toLowerCase().indexOf(searchTerm);
            if (matchIndex >= 0) {
              // Get some context around the match
              const startIndex = Math.max(0, matchIndex - 40);
              const endIndex = Math.min(extractedText.length, matchIndex + searchTerm.length + 40);
              contentPreview = extractedText.substring(startIndex, endIndex);
              
              // Add ellipsis if we're not at the beginning/end
              if (startIndex > 0) contentPreview = "..." + contentPreview;
              if (endIndex < extractedText.length) contentPreview = contentPreview + "...";
            }
          } catch (e) {
            // Fallback for non-JSON content
            contentPreview = "";
          }
        }
        
        return {
          ...note,
          contentPreview
        };
      });
  },
});

// Helper function to extract text from the Plate editor content structure
function extractTextFromContent(content: any[]): string {
  if (!Array.isArray(content)) return "";
  
  return content.map(node => {
    // Handle text nodes
    if (node.text) return node.text;
    
    // Handle paragraph nodes and other containers
    if (node.children && Array.isArray(node.children)) {
      return extractTextFromContent(node.children);
    }
    
    return "";
  }).join(" ");
} 