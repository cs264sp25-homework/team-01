import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Configuration
const DEBOUNCE_TIME_MS = 3000; // 3 seconds
const MIN_CHANGE_THRESHOLD = 50; // minimum character change to trigger embedding
const MIN_CHANGE_PERCENTAGE = 0.05; // minimum 5% change to trigger embedding

// Store to track content changes and last processing time
const contentTracker = new Map<string, { content: string; lastProcessed: number }>();

// Calculate content difference percentage
function getContentDifference(oldContent: string, newContent: string) {
  const maxLength = Math.max(oldContent.length, newContent.length);
  const distance = Math.abs(oldContent.length - newContent.length);
  return distance / maxLength;
}

// Check if content change meets threshold for processing
function shouldProcessContent(oldContent: string, newContent: string): boolean {
  if (!oldContent) return true; // Always process if no previous content
  
  const charDifference = Math.abs(oldContent.length - newContent.length);
  const percentChange = getContentDifference(oldContent, newContent);
  
  return charDifference >= MIN_CHANGE_THRESHOLD || percentChange >= MIN_CHANGE_PERCENTAGE;
}

export const trackContentChange = internalMutation({
  args: {
    noteId: v.id("notes"),
    content: v.string(),
    forceProcess: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const noteId = args.noteId.toString();
    const tracked = contentTracker.get(noteId);
    
    // If force processing is requested, process immediately
    if (args.forceProcess) {
      contentTracker.set(noteId, { content: args.content, lastProcessed: now });
      await processContent(ctx, args.noteId, args.content, now);
      return { processed: true };
    }
    
    // If no previous content or enough time has passed, check for significant changes
    if (!tracked || (now - tracked.lastProcessed >= DEBOUNCE_TIME_MS)) {
      if (shouldProcessContent(tracked?.content || "", args.content)) {
        contentTracker.set(noteId, { content: args.content, lastProcessed: now });
        await processContent(ctx, args.noteId, args.content, now);
        return { processed: true };
      }
    }
    
    return { processed: false };
  },
});

async function processContent(ctx: any, noteId: any, content: string, timestamp: number) {
  // Process chunks
  await ctx.runMutation(internal.chunking.processNoteChunks, {
    noteId,
    content,
  });
  
  // Schedule the embeddings processing action
  await ctx.scheduler.runAfter(0, internal.embeddings.processNoteEmbeddings, {
    noteId,
  });
  
  // Update lastEmbeddedAt timestamp
  await ctx.runMutation(internal.notes.updateLastEmbedded, {
    noteId,
    timestamp,
  });
} 