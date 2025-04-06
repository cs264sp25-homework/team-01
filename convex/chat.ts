import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { ConvexError } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Query to fetch chat history
export const getChatHistory = query({
  args: {
    noteId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
    const userId = identity.tokenIdentifier.split("|")[1];
    
    const limit = args.limit ?? 50;
    
    // Get messages for a specific note
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .order("asc") // Order by timestamp ascending
      .take(limit);
    
    return messages;
  },
});

// Store a message in the database
export const storeMessage = mutation({
  args: {
    content: v.string(),
    sender: v.union(v.literal("user"), v.literal("ai")),
    noteId: v.string(),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
    const userId = identity.tokenIdentifier.split("|")[1];
    
    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      sender: args.sender,
      userId,
      noteId: args.noteId,
      timestamp: Date.now(),
      isComplete: args.isComplete ?? true,
    });
    
    return messageId;
  },
});

// Update a message in the database
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
    const userId = identity.tokenIdentifier.split("|")[1];
    
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new ConvexError({ code: 404, message: "Message not found" });
    }
    
    if (message.userId !== userId) {
      throw new ConvexError({ code: 403, message: "Forbidden" });
    }
    
    await ctx.db.patch(args.messageId, {
      content: args.content,
      isComplete: args.isComplete ?? message.isComplete,
      timestamp: args.isComplete ? Date.now() : message.timestamp,
    });
    
    return args.messageId;
  },
});

// Add this query to fetch a single message
export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

// This action sends a message to OpenAI and streams the response using Vercel AI SDK
export const streamingChatResponse = action({
  args: {
    message: v.string(),
    noteId: v.string(),
    contextMessageCount: v.optional(v.number()),
    noteTitle: v.optional(v.string()),
    noteContent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ messageId: Id<"messages">; content: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    
    if (!userId) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ConvexError({ 
        code: 500, 
        message: "OpenAI API key not configured" 
      });
    }
    
    try {
      // Store the user message first
      await ctx.runMutation(api.chat.storeMessage, {
        content: args.message,
        sender: "user",
        noteId: args.noteId,
      });
      
      // Create an empty AI message that will be updated with the streaming response
      const aiMessageId = await ctx.runMutation(api.chat.storeMessage, {
        content: "",
        sender: "ai",
        noteId: args.noteId,
        isComplete: false,
      });
      
      // Get previous messages for context
      const previousMessages = await ctx.runQuery(api.chat.getChatHistory, {
        noteId: args.noteId,
        limit: args.contextMessageCount ?? 10,
      });
      
      // Format messages for Vercel AI SDK - exclude system message
      const formattedMessages = previousMessages.map(msg => ({
        role: msg.sender === "user" ? "user" as const : "assistant" as const,
        content: msg.content,
      }));
      
      // Create a system prompt that includes the note title and content
      let systemPrompt = "You are a helpful AI assistant that helps users with their documents.";
      
      // Add note context if provided
      if (args.noteTitle || args.noteContent) {
        systemPrompt += "\n\nCurrent document context:";
        
        if (args.noteTitle) {
          systemPrompt += `\nTitle: ${args.noteTitle}`;
        }
        
        if (args.noteContent) {
          // Parse the note content if it's in JSON format
          try {
            const parsedContent = JSON.parse(args.noteContent);
            // Create a plain text representation of the content
            let plainTextContent = "";
            const extractTextFromNodes = (nodes: any[]) => {
              for (const node of nodes) {
                if (node.text) {
                  plainTextContent += node.text + " ";
                }
                if (node.children && Array.isArray(node.children)) {
                  extractTextFromNodes(node.children);
                }
              }
            };
            
            extractTextFromNodes(parsedContent);
            systemPrompt += `\nContent: ${plainTextContent.substring(0, 1500)}`; // Limit content length
          } catch (error) {
            // If parsing fails, use content as is with a length limit
            systemPrompt += `\nContent: ${args.noteContent.substring(0, 1500)}`;
          }
        }
        
        systemPrompt += "\n\nPlease refer to this document content when answering questions about it.";
      }
      
      // Use the systemPrompt parameter instead of a system message
      const result = streamText({
        model: openai("gpt-4o"),
        messages: formattedMessages,
        temperature: 0.7,
        system: systemPrompt
      });
      
      let fullResponse = "";
      
      // Process the stream using textStream - update on every token
      for await (const delta of result.textStream) {
        fullResponse += delta;
        
        // Update the message in the database with each token
        await ctx.runMutation(api.chat.updateMessage, {
          messageId: aiMessageId,
          content: fullResponse,
          isComplete: false,
        });
      }
      
      // Final update with complete flag
      await ctx.runMutation(api.chat.updateMessage, {
        messageId: aiMessageId,
        content: fullResponse,
        isComplete: true,
      });
      
      return { 
        messageId: aiMessageId,
        content: fullResponse 
      };
    } catch (error) {
      console.error("Error calling AI service:", error);
      
      // Type check error before accessing properties
      if (error && typeof error === "object" && "status" in error) {
        if (error.status === 429) {
          throw new ConvexError({ 
            code: 429, 
            message: "Rate limit exceeded. Please try again later." 
          });
        } else if (error.status === 400) {
          throw new ConvexError({ 
            code: 400, 
            message: "Invalid request to AI service." 
          });
        }
      }
      
      // Default error
      throw new ConvexError({ 
        code: 500, 
        message: "Failed to get AI response" 
      });
    }
  },
});

// Regenerate a message with streaming
export const regenerateStreamingResponse = action({
  args: {
    messageId: v.id("messages"),
    noteId: v.string(),
    contextMessageCount: v.optional(v.number()),
    noteTitle: v.optional(v.string()),
    noteContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    
    if (!userId) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    try {
      // Get the message to regenerate
      const message = await ctx.runQuery(api.chat.getMessage, { 
        messageId: args.messageId 
      });
      if (!message) {
        throw new ConvexError({ code: 404, message: "Message not found" });
      }
      
      // Find the user message that prompted this response
      const userMessages = await ctx.runQuery(api.chat.getChatHistory, {
        noteId: args.noteId,
        limit: 50,
      });
      
      const messageIndex = userMessages.findIndex(msg => msg._id === args.messageId);
      if (messageIndex <= 0) {
        throw new ConvexError({ code: 400, message: "Cannot find user message" });
      }
      
      const userMessage = userMessages[messageIndex - 1];
      if (userMessage.sender !== "user") {
        throw new ConvexError({ code: 400, message: "Previous message is not from user" });
      }
      
      // Delete all messages after this one
      await ctx.runMutation(api.chat.deleteMessagesAfter, {
        messageId: args.messageId,
        noteId: args.noteId,
      });
      
      // Reset the AI message content
      await ctx.runMutation(api.chat.updateMessage, {
        messageId: args.messageId,
        content: "",
        isComplete: false,
      });
      
      // Get context messages
      const contextCount = args.contextMessageCount ?? 10;
      const contextMessages = userMessages.slice(Math.max(0, messageIndex + 1 - contextCount), messageIndex + 1);
      
      // Format messages for Vercel AI SDK - exclude system message
      const formattedMessages = contextMessages.map(msg => ({
        role: msg.sender === "user" ? "user" as const : "assistant" as const,
        content: msg.content,
      }));
      
      // Create a system prompt that includes the note title and content
      let systemPrompt = "You are a helpful AI assistant that helps users with their documents.";
      
      // Add note context if provided
      if (args.noteTitle || args.noteContent) {
        systemPrompt += "\n\nCurrent document context:";
        
        if (args.noteTitle) {
          systemPrompt += `\nTitle: ${args.noteTitle}`;
        }
        
        if (args.noteContent) {
          // Parse the note content if it's in JSON format
          try {
            const parsedContent = JSON.parse(args.noteContent);
            // Create a plain text representation of the content
            let plainTextContent = "";
            const extractTextFromNodes = (nodes: any[]) => {
              for (const node of nodes) {
                if (node.text) {
                  plainTextContent += node.text + " ";
                }
                if (node.children && Array.isArray(node.children)) {
                  extractTextFromNodes(node.children);
                }
              }
            };
            
            extractTextFromNodes(parsedContent);
            systemPrompt += `\nContent: ${plainTextContent.substring(0, 1500)}`; // Limit content length
          } catch (error) {
            // If parsing fails, use content as is with a length limit
            systemPrompt += `\nContent: ${args.noteContent.substring(0, 1500)}`;
          }
        }
        
        systemPrompt += "\n\nPlease refer to this document content when answering questions about it.";
      }
      
      // Use the systemPrompt parameter instead of a system message
      const result = streamText({
        model: openai("gpt-4o"),
        messages: formattedMessages,
        temperature: 0.7,
        system: systemPrompt
      });
      
      let fullResponse = "";
      
      // Process the stream using textStream - update on every token
      for await (const delta of result.textStream) {
        fullResponse += delta;
        
        // Update the message in the database with each token
        await ctx.runMutation(api.chat.updateMessage, {
          messageId: args.messageId,
          content: fullResponse,
          isComplete: false,
        });
      }
      
      // Final update with complete flag
      await ctx.runMutation(api.chat.updateMessage, {
        messageId: args.messageId,
        content: fullResponse,
        isComplete: true,
      });
      
      return { 
        messageId: args.messageId,
        content: fullResponse 
      };
    } catch (error) {
      console.error("Error regenerating AI response:", error);
      
      // Handle different types of errors with proper status codes
      if (error && typeof error === "object" && "status" in error) {
        if (error.status === 429) {
          throw new ConvexError({ 
            code: 429, 
            message: "Rate limit exceeded. Please try again later." 
          });
        } else if (error.status === 400) {
          throw new ConvexError({ 
            code: 400, 
            message: "Invalid request to AI service." 
          });
        }
      }
      
      throw new ConvexError({ 
        code: 500, 
        message: "Failed to regenerate AI response" 
      });
    }
  },
});

// Delete messages after a specific message
export const deleteMessagesAfter = mutation({
  args: {
    messageId: v.id("messages"),
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get the message to find its timestamp
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new ConvexError({ code: 404, message: "Message not found" });
    }
    
    // Find all messages with a timestamp greater than the specified message
    const messagesToDelete = await ctx.db
      .query("messages")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .filter((q) => q.gt(q.field("timestamp"), message.timestamp))
      .collect();
    
    // Delete all the messages
    for (const msg of messagesToDelete) {
      await ctx.db.delete(msg._id);
    }
    
    return { deletedCount: messagesToDelete.length };
  },
});

// Add this new mutation to delete all chat messages for a note
export const clearChatHistory = mutation({
  args: {
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: 401, message: "Unauthorized" });
    }
    
    // Extract userId the same way as in notes.ts
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Find all messages for this note and user
    const messagesToDelete = await ctx.db
      .query("messages")
      .withIndex("by_user_and_note", (q) => 
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .collect();
    
    // Delete all the messages
    for (const msg of messagesToDelete) {
      await ctx.db.delete(msg._id);
    }
    
    return { deletedCount: messagesToDelete.length };
  },
}); 