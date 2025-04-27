import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import {  Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

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
    
    // Process updated note to create/update chunks
    await ctx.scheduler.runAfter(0, internal.chunking.processNoteChunks, {
      noteId: args.id,
      content: args.content,
    });
    
    // Process the note to create embeddings
    await ctx.scheduler.runAfter(0, internal.embeddings.processNoteEmbeddings, {
      noteId: args.id,
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
  args: { 
    query: v.string(),
    semantic: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier.split("|")[1];
    const searchTerm = args.query.toLowerCase();
    
    // If semantic search is enabled, we can't directly use embeddings in a query
    // The user will need to handle this in the UI by calling the semanticSearch action
    if (args.semantic) {
      // Return empty results to indicate semanticSearch action should be used
      return [];
    }
    
    // Regular text-based search
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

// Semantic search using embeddings
export const semanticSearch = action({
  args: { 
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"notes">;
    title: string;
    content: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    contentPreview?: string;
    similarity?: number;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier.split("|")[1];
    console.log(`Performing semantic search for user ${userId} with query: "${args.query}"`);
    
    try {
      // Get semantic search results from embeddings
      const searchResults = await ctx.runAction(api.embeddings.searchSimilarContent, {
        query: args.query,
        limit: 15
      });
      
      console.log(`Semantic search found ${searchResults.length} matching chunks`);
      
      if (searchResults.length === 0) {
        console.log("No matching chunks found");
        return [];
      }
      
      // Get all notes for the user in one query
      const allUserNotes = await ctx.runQuery(api.notes.list);
      
      // Create a map for quick lookup
      const noteMap = new Map();
      for (const note of allUserNotes) {
        noteMap.set(note._id, note);
      }
      
      // Group by note and take highest similarity score
      const noteScores = new Map();
      const noteContents = new Map();
      
      for (const result of searchResults) {
        const currentScore = noteScores.get(result.noteId) || 0;
        if (result.similarity > currentScore) {
          noteScores.set(result.noteId, result.similarity);
          noteContents.set(result.noteId, result.content);
        }
      }
      
      // Build results from the best matches
      const results = [];
      
      for (const [noteId, similarity] of noteScores.entries()) {
        const note = noteMap.get(noteId);
        if (!note || note.userId !== userId) continue;
        
        const matchContent = noteContents.get(noteId);
        
        // Create a preview
        let preview = matchContent.substring(0, 150);
        if (matchContent.length > 150) preview += "...";
        
        results.push({
          ...note,
          contentPreview: preview,
          similarity: similarity
        });
      }
      
      // Sort by similarity (highest first)
      results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      
      console.log(`Returned ${results.length} matching notes sorted by similarity`);
      
      return results;
    } catch (error) {
      console.error("Semantic search error:", error);
      return [];
    }
  }
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

// Reprocess all notes to regenerate chunks and embeddings
export const regenerateAllEmbeddings = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; count: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier.split("|")[1];
    console.log(`Regenerating embeddings for all notes of user ${userId}`);
    
    try {
      // Get all notes for the user
      const notes = await ctx.runQuery(api.notes.list);
      console.log(`Found ${notes.length} notes to reprocess`);
      
      // Process each note to recreate chunks and embeddings
      let processedCount = 0;
      for (const note of notes) {
        console.log(`Regenerating chunks and embeddings for note: ${note.title} (${note._id})`);
        
        // Delete existing embeddings for this note first
        const existingEmbeddings = await ctx.runQuery(internal.embeddings.getEmbeddingsForNote, { noteId: note._id });
        console.log(`Deleting ${existingEmbeddings.length} existing embeddings for note ${note._id}`);
        for (const embedding of existingEmbeddings) {
          await ctx.runMutation(internal.embeddings.deleteEmbedding, { embeddingId: embedding._id });
        }
        
        // Process the note to create/update chunks
        await ctx.runMutation(internal.chunking.processNoteChunks, {
          noteId: note._id,
          content: note.content,
        });
        
        // Process the note to create embeddings based on new chunks
        await ctx.runAction(internal.embeddings.processNoteEmbeddings, {
          noteId: note._id,
        });
        
        processedCount++;
      }
      
      console.log(`Successfully reprocessed ${processedCount} notes`);
      return { success: true, count: processedCount };
    } catch (error) {
      console.error("Error regenerating embeddings:", error);
      return { success: false, count: 0 };
    }
  }
}); 