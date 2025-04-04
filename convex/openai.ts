import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";

// Organize notes using OpenAI
export const organizeNotes = action({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ConvexError({ 
        code: 500, 
        message: "OpenAI API key not configured" 
      });
    }
    
    try {
      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey });
      
      // Parse the content to get the actual text and structure
      const notes = JSON.parse(args.content);
      
      // Make a standard OpenAI API call
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: `You are a notes organization assistant. Your task is to organize notes by:
            
            1. Creating clear headings to break up sections
            2. Organizing information into relevant bullet points
            3. Adding sub-bullets to expand on unclear points
            4. Maintaining all original formatting (bold, underline, etc.)
            5. Preserving any special styling and colors from the original
            
            EXTREMELY IMPORTANT: 
            1. You MUST return ALL content from the original notes - don't lose any information
            2. Your response MUST be a valid JSON ARRAY (starting with [ and ending with ])
            3. Return the same structure but better organized, with all original nodes preserved
            4. Each object in the array must have all its original properties
            5. DO NOT wrap your response in markdown code blocks or any formatting
            
            The notes are structured as an array of objects with:
            - "type" property (usually "p" for paragraph)
            - "children" array with text content and formatting attributes
            - "id" property that must be preserved
            - Other properties like "indent", "listStyleType" that must be kept
            
            NEVER RETURN A SINGLE OBJECT - ALWAYS RETURN AN ARRAY OF OBJECTS
            DO NOT include markdown like \`\`\`json or \`\`\` - just output the raw JSON array
            
            For testing purposes, make sure the last paragraph contains the text "testing last sentence in prompt openai.ts"`
          },
          { 
            role: "user", 
            content: `Please organize these notes while preserving their complete format and all content:
            ${JSON.stringify(notes, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
        // Removed response_format to allow array response
      });
      
      // Get the response content
      let organizedContent = completion.choices[0].message.content?.trim() || "[]";
      console.log("Original response:", organizedContent);
      
      // Strip markdown code blocks if present
      if (organizedContent.startsWith("```")) {
        // Extract content between code blocks
        const codeBlockMatch = organizedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          organizedContent = codeBlockMatch[1].trim();
          console.log("Extracted content from code block:", organizedContent);
        } else {
          // If regex didn't work, try a simpler approach
          organizedContent = organizedContent
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          console.log("Stripped code block markers:", organizedContent);
        }
      }
      
      // Check if the response starts and ends with array brackets
      if (!organizedContent.startsWith('[') || !organizedContent.endsWith(']')) {
        console.error("Response is not a JSON array after cleanup:", organizedContent);
        throw new ConvexError({
          code: 500,
          message: "Response from AI is not a JSON array.",
        });
      }
      
      // Validate the response is proper JSON
      try {
        const parsed = JSON.parse(organizedContent);
        if (!Array.isArray(parsed)) {
          throw new Error("Parsed result is not an array");
        }
        
        // Make sure we have at least some content
        if (parsed.length === 0) {
          throw new Error("Empty array returned");
        }
        
        console.log("Successfully parsed array with", parsed.length, "items");
        
        // Add the test sentence to the last paragraph if not already there
        const lastItem = parsed[parsed.length - 1];
        if (lastItem && lastItem.children && lastItem.children.length > 0) {
          const lastText = lastItem.children[0].text || "";
          
          if (!lastText.includes("testing last sentence in prompt openai.ts")) {
            parsed.push({
              type: "p",
              children: [{ text: "testing last sentence in prompt openai.ts" }],
              id: "test-" + Date.now()
            });
            
            // Re-stringify with the added test paragraph
            organizedContent = JSON.stringify(parsed);
          }
        }
        
      } catch (e) {
        console.error("JSON parsing error:", e, organizedContent);
        throw new ConvexError({
          code: 500,
          message: "Invalid response from AI. Could not parse as JSON array.",
        });
      }
      
      return { organizedContent };
    } catch (error) {
      console.error("Error in organize-notes action:", error);
      
      if (error instanceof ConvexError) {
        throw error;
      }
      
      throw new ConvexError({
        code: 500,
        message: "Failed to organize notes",
      });
    }
  },
});
