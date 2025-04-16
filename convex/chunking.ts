import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Configuration
const CHUNK_SIZE = 500; // Reduced from 1000 to 500 for better semantic precision
const CHUNK_OVERLAP = 100; // Characters of overlap between chunks

// Define types for Plate editor content
interface PlateTextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  [key: string]: unknown;
}

interface PlateElementNode {
  type?: string;
  children: (PlateTextNode | PlateElementNode)[];
  id?: string;
  [key: string]: unknown;
}

type PlateNode = PlateTextNode | PlateElementNode;

// Extract plain text from the Plate editor's JSON structure
function extractTextFromContent(content: PlateNode[]): string {
  if (!Array.isArray(content)) {
    try {
      return typeof content === 'string' ? content : JSON.stringify(content);
    } catch {
      return "";
    }
  }
  
  return content.map(node => {
    // Skip empty nodes
    if (!node) return "";
    
    // Handle nodes with children property (typical Plate node structure)
    if ('children' in node && Array.isArray(node.children)) {
      return node.children
        .map((child: PlateNode) => {
          // Handle child nodes based on their structure
          if (typeof child === 'object') {
            return 'text' in child ? child.text : '';
          } else if (typeof child === 'string') {
            return child;
          }
          return '';
        })
        .join("");
    }
    
    // Handle simple text nodes or unknown structures
    if (typeof node === 'string') {
      return node;
    } else if ('text' in node) {
      return node.text;
    }
    
    return "";
  }).join("\n");
}

// Function to split text into chunks with overlap
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    
    // If we've reached the end of the text
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }
    
    // Try to find a natural breaking point (end of sentence or paragraph)
    const lastPeriod = text.lastIndexOf('.', end);
    const lastNewline = text.lastIndexOf('\n', end);
    end = Math.max(lastPeriod, lastNewline);
    
    // If we couldn't find a good breaking point, use the full chunk size
    if (end <= start) {
      end = start + CHUNK_SIZE;
    }
    
    chunks.push(text.slice(start, end));
    start = end - CHUNK_OVERLAP; // Create overlap
  }
  
  return chunks;
}

// Process a note's content into chunks
export const processNoteChunks = internalMutation({
  args: {
    noteId: v.id("notes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Parse the note content
      let parsedContent;
      try {
        parsedContent = JSON.parse(args.content);
      } catch {
        throw new ConvexError({
          code: 400,
          message: "Invalid note content format"
        });
      }
      
      // Extract plain text from the structured content
      const plainText = extractTextFromContent(parsedContent);
      
      // Split text into chunks
      const chunks = splitIntoChunks(plainText);
      console.log(`Split note ${args.noteId} into ${chunks.length} chunks`);
      
      // Delete any existing chunks for this note
      const existingChunks = await ctx.db
        .query("chunks")
        .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
        .collect();
      
      for (const chunk of existingChunks) {
        await ctx.db.delete(chunk._id);
      }
      
      // Store the new chunks
      for (let i = 0; i < chunks.length; i++) {
        await ctx.db.insert("chunks", {
          noteId: args.noteId,
          content: chunks[i],
          index: i,
        });
      }
      
      return { success: true, chunkCount: chunks.length };
    } catch (error) {
      console.error("Error processing note chunks:", error);
      throw error;
    }
  },
});

// Query to get chunks for a note
export const getChunksForNote = internalQuery({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chunks")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .order("asc")
      .collect();
  },
}); 