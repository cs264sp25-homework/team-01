import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { ConvexError } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { OpenAI } from "openai";

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
    useEmbeddings: v.optional(v.boolean()),
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
      
      // Create a system prompt that includes the note title and relevant content
      let systemPrompt = "You are a helpful AI assistant that helps users with their documents.";
      
      // Get relevant context chunks using embeddings if enabled
      if (args.useEmbeddings !== false) {
        try {
          // Get relevant chunks using embeddings search
          const relevantChunks = await ctx.runAction(api.embeddings.searchSimilarContent, {
            query: args.message,
            limit: 5 // Get top 5 most relevant chunks
          });
          
          if (relevantChunks && relevantChunks.length > 0) {
            systemPrompt += "\n\nHere are relevant sections from the document that may help answer the question:";
            
            relevantChunks.forEach((chunk, index) => {
              systemPrompt += `\n\nSection ${index + 1} (Relevance: ${Math.round(chunk.similarity * 100)}%):\n${chunk.content}`;
            });
            
            console.log(`Found ${relevantChunks.length} relevant chunks for the query`);
          } else {
            console.log("No relevant chunks found for the query");
          }
        } catch (error) {
          console.error("Error retrieving relevant chunks:", error);
          // Continue without embeddings if there's an error
        }
      }
      
      // Add note title if provided
      if (args.noteTitle) {
        systemPrompt += `\n\nDocument Title: ${args.noteTitle}`;
      }
      
      // Add note content if explicitly requested (in-note chat) or as a fallback
      // if embeddings were used but didn't find anything relevant.
      if (args.noteContent && (args.useEmbeddings === false || !systemPrompt.includes("relevant sections"))) {
        systemPrompt += `\n\nFull Document Content (first 8000 chars):\n${args.noteContent.substring(0, 8000)}`; // Limit content
      }
      
      systemPrompt += "\n\nPlease provide a helpful, accurate response based on the document content provided.";
      
      // Use the systemPrompt parameter instead of a system message
      const result = streamText({
        model: openai("gpt-4o"),
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages
        ],
        temperature: 0.7
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
    useEmbeddings: v.optional(v.boolean()),
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
      
      // Create a system prompt that includes the note title and relevant content
      let systemPrompt = "You are a helpful AI assistant that helps users with their documents.";
      
      // Get relevant context chunks using embeddings if enabled
      if (args.useEmbeddings !== false) {
        try {
          // Get relevant chunks using embeddings search
          const relevantChunks = await ctx.runAction(api.embeddings.searchSimilarContent, {
            query: userMessage.content, // Use the user message as the query
            limit: 5 // Get top 5 most relevant chunks
          });
          
          if (relevantChunks && relevantChunks.length > 0) {
            systemPrompt += "\n\nHere are relevant sections from the document that may help answer the question:";
            
            relevantChunks.forEach((chunk, index) => {
              systemPrompt += `\n\nSection ${index + 1} (Relevance: ${Math.round(chunk.similarity * 100)}%):\n${chunk.content}`;
            });
            
            console.log(`Found ${relevantChunks.length} relevant chunks for the query`);
          } else {
            console.log("No relevant chunks found for the query");
          }
        } catch (error) {
          console.error("Error retrieving relevant chunks:", error);
          // Continue without embeddings if there's an error
        }
      }
      
      // Add note title if provided
      if (args.noteTitle) {
        systemPrompt += `\n\nDocument Title: ${args.noteTitle}`;
      }
      
      // Add note content if explicitly requested (in-note chat) or as a fallback
      // if embeddings were used but didn't find anything relevant.
      if (args.noteContent && (args.useEmbeddings === false || !systemPrompt.includes("relevant sections"))) {
        systemPrompt += `\n\nFull Document Content (first 8000 chars):\n${args.noteContent.substring(0, 8000)}`; // Limit content
      }
      
      systemPrompt += "\n\nPlease provide a helpful, accurate response based on the document content provided.";
      
      // Use the systemPrompt parameter instead of a system message
      const result = streamText({
        model: openai("gpt-4o"),
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages
        ],
        temperature: 0.7
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

// Action to handle chat with context from embeddings
export const chatWithContext = action({
  args: {
    noteId: v.string(),
    message: v.string(),
    previousMessages: v.array(
      v.object({
        _id: v.id("messages"),
        content: v.string(),
        sender: v.union(v.literal("user"), v.literal("ai")),
        userId: v.string(),
        noteId: v.string(),
        timestamp: v.number(),
        isComplete: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    response: string;
    context: Array<{ content: string; similarity: number }>;
  }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ConvexError({
        code: 500,
        message: "OpenAI API key not configured"
      });
    }

    try {
      // Get relevant chunks using embeddings search
      const searchResults = await ctx.runAction(api.embeddings.searchSimilarContent, {
        query: args.message,
        limit: 5
      });

      // Format context from retrieved chunks
      const context = searchResults.map(result => ({
        content: result.content,
        similarity: result.similarity
      }));

      // Create a system prompt with the retrieved context
      let systemPrompt = "You are a helpful AI assistant. Answer questions based on the relevant context provided:";
      
      searchResults.forEach((chunk, index) => {
        systemPrompt += `\n\nRELEVANT CONTEXT ${index + 1} (Relevance: ${Math.round(chunk.similarity * 100)}%):\n${chunk.content}`;
      });
      
      systemPrompt += "\n\nWhen answering, use the provided context information. If the context doesn't contain relevant information, say so rather than making up an answer.";

      // Format previous conversation messages
      const messages = args.previousMessages.map(msg => ({
        role: msg.sender === "user" ? "user" as const : "assistant" as const,
        content: msg.content,
      }));
      
      // Add the current message
      messages.push({
        role: "user" as const,
        content: args.message,
      });

      // Call OpenAI
      const openai = new OpenAI({ apiKey });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      // Extract the response
      const response = completion.choices[0]?.message?.content || "";

      return {
        response,
        context
      };
    } catch (error) {
      console.error("Error in chat with context:", error);
      throw new ConvexError({
        code: 500,
        message: "Failed to generate chat response",
      });
    }
  },
});

// New action for the ephemeral "Ask AI" chat feature
export const askAI = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<{ response: string; sources: { title: string, id: Id<"notes"> }[] }> => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      // Return an error structure
      return { response: "Error: Unauthorized. Please sign in.", sources: [] };
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key not configured for askAI");
      return { response: "Error: AI functionality is not configured.", sources: [] };
    }
    
    try {
      // 1. Perform semantic search
      let contextForPrompt = "";
      let sourceNotes : { title: string, id: Id<"notes"> }[] = []; 
      try {
        const relevantChunks = await ctx.runAction(api.embeddings.searchSimilarContent, {
          query: args.query,
          limit: 5, 
        });
        
        if (relevantChunks && relevantChunks.length > 0) {
          contextForPrompt = "\n\nRelevant Information from Notes:";
          const addedNoteIds = new Set<string>();
          relevantChunks.forEach((chunk) => {
            contextForPrompt += `\n\nSource: ${chunk.noteTitle}\nContent: ${chunk.content}`;
            if (!addedNoteIds.has(chunk.noteId)) {
                 sourceNotes.push({ title: chunk.noteTitle, id: chunk.noteId });
                 addedNoteIds.add(chunk.noteId);
            }
          });
          console.log(`Found ${relevantChunks.length} relevant chunks for the Ask AI query.`);
        } else {
          console.log("No relevant chunks found for the Ask AI query.");
          contextForPrompt = "\n\nNo specific information from your notes seemed relevant to the question.";
        }
      } catch (error) {
        console.error("Error retrieving relevant chunks for Ask AI:", error);
        contextForPrompt = "\n\n(Could not retrieve context from notes due to an error.)";
      }
      
      // Construct the system prompt
      let systemPrompt = `You are a helpful AI assistant. Answer the user's question naturally and conversationally. Use the following information from the user's notes to inform your answer, but do not explicitly mention 'the context' or 'the snippets provided'. Your response should ONLY contain the answer to the question. Do NOT include a 'Sources:' section or list any source titles in your response.`;
      systemPrompt += contextForPrompt;
      systemPrompt += "\n\nUser's Question:";

      // 2. Call OpenAI API
      const openaiClient = new OpenAI({ apiKey });
      const chatCompletion = await openaiClient.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.query }
        ],
        model: "gpt-4o", 
        temperature: 0.7,
      });

      const responseContent = chatCompletion.choices[0]?.message?.content;

      if (!responseContent) {
        console.error("OpenAI returned an empty response for askAI.")
        return { response: "Error: AI returned an empty response.", sources: [] };
      }

      // 3. Return the response string AND the source notes
      return { response: responseContent, sources: sourceNotes };

    } catch (error) {
      console.error("Error in askAI action:", error);
      // Return a user-friendly error message string
      let errorMessage = "Sorry, I encountered an error while processing your request.";
      if (error instanceof ConvexError) {
        errorMessage = error.message; // Use Convex error message if available
      } else if (error instanceof Error) {
        // Basic check for specific OpenAI errors if needed
        if (error.message.includes('rate limit')) {
          errorMessage = "AI rate limit reached. Please try again later.";
        } else if (error.message.includes('insufficient_quota')) {
           errorMessage = "AI quota exceeded.";
        }
        // else keep generic message
      }
      return { response: `Error: ${errorMessage}`, sources: [] };
    }
  },
}); 