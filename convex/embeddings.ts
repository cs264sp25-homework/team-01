import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Configuration
const EMBEDDING_MODEL = "text-embedding-3-small";

// Interface for embedding document type
interface EmbeddingDoc {
  chunkId: Id<"chunks">;
  noteId: Id<"notes">;
  vector: number[];
  createdAt: number;
}

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
      // Check if embedding already exists for this chunk
      const existingEmbeddings = await ctx.db
        .query("embeddings")
        .withIndex("by_chunkId", (q) => q.eq("chunkId", args.chunkId))
        .collect();
      
      // Delete existing embeddings for this chunk
      for (const embedding of existingEmbeddings) {
        await ctx.db.delete(embedding._id);
      }
      
      // Store new embedding
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
      
      // Generate embedding for the query
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: args.query,
        encoding_format: "float",
      });

      const queryVector = response.data[0].embedding;
      
      // Get all embeddings
      const embeddings: Array<EmbeddingDoc & { _id: Id<"embeddings"> }> = 
        await ctx.runQuery(internal.embeddings.listEmbeddings);
      
      // Calculate similarity scores
      const similarities = embeddings.map((embedding) => {
        const similarity = calculateCosineSimilarity(queryVector, embedding.vector);
        return {
          chunkId: embedding.chunkId,
          noteId: embedding.noteId,
          similarity,
        };
      });
      
      // Sort by similarity score (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Take top results
      const topResults = similarities.slice(0, args.limit || 5);
      
      // Get the actual chunk content for the top results
      const results = await Promise.all(
        topResults.map(async (result) => {
          const chunk = await ctx.runQuery(internal.embeddings.getChunkById, {
            id: result.chunkId,
          });
          
          return {
            chunkId: result.chunkId,
            noteId: result.noteId,
            content: chunk?.content || "",
            similarity: result.similarity,
          };
        })
      );
      
      return results;
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