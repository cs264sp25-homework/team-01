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
      // Note already deleted, perhaps? Succeed gracefully.
      console.warn(`Attempted to delete non-existent note: ${args.id}`);
      return args.id;
    }
    
    if (existingNote.userId !== userId) {
      throw new Error("Unauthorized to delete this note");
    }
    
    // 1. Delete associated embeddings
    try {
      const embeddingsToDelete = await ctx.runQuery(internal.embeddings.getEmbeddingsForNote, { noteId: args.id });
      console.log(`Deleting ${embeddingsToDelete.length} embeddings for note ${args.id}`);
      for (const embedding of embeddingsToDelete) {
        await ctx.runMutation(internal.embeddings.deleteEmbedding, { embeddingId: embedding._id });
      }
    } catch (error) {
      console.error(`Error deleting embeddings for note ${args.id}:`, error);
      // Decide if we should continue or throw? For now, log and continue deletion.
    }
    
    // 2. Delete associated chunks
    try {
      // Assuming getChunksForNote is available in internal API
      const chunksToDelete = await ctx.runQuery(internal.chunking.getChunksForNote, { noteId: args.id }); 
      console.log(`Deleting ${chunksToDelete.length} chunks for note ${args.id}`);
      for (const chunk of chunksToDelete) {
        await ctx.db.delete(chunk._id);
      }
    } catch (error) {
       console.error(`Error deleting chunks for note ${args.id}:`, error);
       // Log and continue
    }
    
    // 3. Delete the note itself
    await ctx.db.delete(args.id);
    console.log(`Successfully deleted note ${args.id} and associated data.`);
    
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

// Generate a unique share code and record sharing info
export const share = mutation({
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
    
    // Generate a unique share code
    const shareCode = Math.random().toString(36).substring(2, 10);
    
    // Get or create share info
    const existingShares = await ctx.db
      .query("shared_notes")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.id))
      .collect();
      
    if (existingShares.length > 0) {
      // Return existing share code
      return existingShares[0].shareCode;
    }
    
    // Record share info
    await ctx.db.insert("shared_notes", {
      noteId: args.id,
      ownerId: userId,
      shareCode: shareCode,
      createdAt: Date.now()
    });
    
    return shareCode;
  },
});

// Import a note by share code
export const importNote = mutation({
  args: {
    shareCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get shared note info
    const sharedNoteInfo = await ctx.db
      .query("shared_notes")
      .withIndex("by_shareCode", (q) => q.eq("shareCode", args.shareCode))
      .first();
    
    if (!sharedNoteInfo) {
      throw new Error("Invalid share code");
    }
    
    // Get the original note
    const originalNote = await ctx.db.get(sharedNoteInfo.noteId);
    
    if (!originalNote) {
      throw new Error("Note not found");
    }
    
    const now = Date.now();
    
    // Create a new note with the same content but for the current user
    const newNoteId = await ctx.db.insert("notes", {
      title: `${originalNote.title} (Imported)`,
      content: originalNote.content,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    
    // Process the note to create chunks
    await ctx.scheduler.runAfter(0, internal.chunking.processNoteChunks, {
      noteId: newNoteId,
      content: originalNote.content,
    });
    
    // Process the note to create embeddings
    await ctx.scheduler.runAfter(0, internal.embeddings.processNoteEmbeddings, {
      noteId: newNoteId,
    });
    
    return newNoteId;
  },
});

// Action to process chunks and embeddings, typically triggered on leaving a note
export const processNoteEmbeddingsOnNavigate = action({
  args: {
    noteId: v.id("notes"),
    content: v.string(), // Pass content to avoid re-fetching
  },
  handler: async (ctx, args): Promise<{ success: boolean; }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Allow processing even if not logged in? Or should this be secured?
      // For now, let's assume it requires auth context to be safe.
      throw new Error("Not authenticated");
    }

    try {
      console.log(`Processing chunks and embeddings for note ${args.noteId} on navigate`);
      
      // 1. Delete existing embeddings for this note
      const existingEmbeddings = await ctx.runQuery(internal.embeddings.getEmbeddingsForNote, { noteId: args.noteId });
      console.log(`Deleting ${existingEmbeddings.length} existing embeddings for note ${args.noteId}`);
      for (const embedding of existingEmbeddings) {
        await ctx.runMutation(internal.embeddings.deleteEmbedding, { embeddingId: embedding._id });
      }
      
      // 2. Process chunks (this mutation already deletes old chunks)
      await ctx.runMutation(internal.chunking.processNoteChunks, {
        noteId: args.noteId,
        content: args.content, // Use the provided content
      });
      
      // 3. Process embeddings for the newly created chunks
      await ctx.runAction(internal.embeddings.processNoteEmbeddings, {
        noteId: args.noteId,
      });
      
      console.log(`Successfully processed chunks and embeddings for note ${args.noteId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error processing chunks/embeddings for note ${args.noteId}:`, error);
      // Decide if failure should propagate or just be logged
      // throw error; // Re-throw if the caller needs to know about failure
      return { success: false }; // Or return failure status
    }
  },
});

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