import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Configuration
const EMBEDDING_MODEL = "text-embedding-3-small";

// Generate embeddings for a chunk using OpenAI
export const generateEmbedding = internalAction({
  args: {
    chunkId: v.id("chunks"),
    noteId: v.id("notes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ConvexError({
          code: 500,
          message: "OpenAI API key not configured"
        });
      }

      const openai = new OpenAI({ apiKey });
      
      // Generate embedding from OpenAI
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: args.content,
        encoding_format: "float",
      });

      const vector = response.data[0].embedding;
      
      // Store the embedding in the database
      await ctx.runMutation(internal.embeddings.storeEmbedding, {
        chunkId: args.chunkId,
        noteId: args.noteId,
        vector,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  },
});

// Store embeddings in the database
export const storeEmbedding = internalMutation({
  args: {
    chunkId: v.id("chunks"),
    noteId: v.id("notes"),
    vector: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Store new embedding directly
      const now = Date.now();
      await ctx.db.insert("embeddings", {
        chunkId: args.chunkId,
        noteId: args.noteId,
        vector: args.vector,
        createdAt: now,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error storing embedding:", error);
      throw error;
    }
  },
});

// Add query function to get a chunk by ID
export const getChunkById = internalQuery({
  args: {
    id: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Process embeddings for all chunks of a note
export const processNoteEmbeddings = internalAction({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; chunkCount: number }> => {
    try {
      // Get all chunks for the note
      const chunks: Array<{ _id: Id<"chunks">; content: string; noteId: Id<"notes">; index: number }> = 
        await ctx.runQuery(internal.chunking.getChunksForNote, {
          noteId: args.noteId,
        });
      
      console.log(`Processing embeddings for ${chunks.length} chunks of note ${args.noteId}`);
      
      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        await ctx.runAction(internal.embeddings.generateEmbedding, {
          chunkId: chunk._id,
          noteId: args.noteId,
          content: chunk.content,
        });
      }
      
      return { success: true, chunkCount: chunks.length };
    } catch (error) {
      console.error("Error processing note embeddings:", error);
      throw error;
    }
  },
});

// Search for similar chunks using embeddings
export const searchSimilarContent = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    chunkId: Id<"chunks">;
    noteId: Id<"notes">;
    noteTitle: string;
    content: string;
    similarity: number;
  }>> => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ConvexError({
          code: 500,
          message: "OpenAI API key not configured"
        });
      }

      const openai = new OpenAI({ apiKey });
      
      console.log(`Generating embedding for query: "${args.query}"`);
      
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: args.query,
        encoding_format: "float",
      });

      const queryVector = response.data[0].embedding;
      
      // Get all embeddings - Consider optimizing if this becomes slow
      // Could potentially use vector search index if available/configured
      const embeddings = await ctx.runQuery(internal.embeddings.listEmbeddings);
      console.log(`Found ${embeddings.length} total embeddings to search through`);
      
      if (embeddings.length === 0) {
        console.log("No embeddings found in database");
        return [];
      }
      
      // Calculate similarity scores
      const similarities = embeddings.map((embedding) => {
        const similarity = calculateCosineSimilarity(queryVector, embedding.vector);
        return {
          chunkId: embedding.chunkId,
          noteId: embedding.noteId,
          similarity,
        };
      });
      
      // Sort by similarity score
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Take top results
      const topLimit = args.limit || 10;
      const topResults = similarities.slice(0, topLimit);
      
      console.log(`Top ${topResults.length} similarities:`, 
        topResults.map(r => `${r.similarity.toFixed(3)} (${r.noteId})`).join(', '));
      
      // Get the chunk content AND note title for the top results
      const resultsWithTitles = await Promise.all(
        topResults.map(async (result) => {
          const chunk = await ctx.runQuery(internal.embeddings.getChunkById, {
            id: result.chunkId,
          });
          // Fetch the note title using the noteId
          const note = await ctx.runQuery(api.notes.get, {
             id: result.noteId 
          }); 
          
          return {
            chunkId: result.chunkId,
            noteId: result.noteId,
            noteTitle: note?.title || "Unknown Note",
            content: chunk?.content || "",
            similarity: result.similarity,
          };
        })
      );
      
      return resultsWithTitles;
    } catch (error) {
      console.error("Error searching similar content:", error);
      throw error;
    }
  },
});

// Get all embeddings
export const listEmbeddings = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("embeddings").collect();
  },
});

// Get all embeddings for a specific note
export const getEmbeddingsForNote = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddings")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
  },
});

// Delete a specific embedding
export const deleteEmbedding = internalMutation({
  args: { embeddingId: v.id("embeddings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.embeddingId);
    return { success: true };
  },
});

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
} 