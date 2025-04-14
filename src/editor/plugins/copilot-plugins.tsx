"use client";

import type { TElement, PlateEditor } from "@udecode/plate";
import { CopilotPlugin, CopilotSuggestionOptions } from "@udecode/plate-ai/react";
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";

import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";

import { GhostText } from "@/plate-ui/ghost-text";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "");

// Debug flag for logging
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log("[Copilot]", ...args);
  }
}

interface GetSuggestionParams {
  editor: PlateEditor;
  at: any; // Location in the document
  text: string;
  open: boolean;
}

// Configure the copilot plugin to use our Convex backend
export const copilotPlugins = [
  CopilotPlugin.configure(({ api: editorApi }) => ({
    options: {
      debounceDelay: 300, // Shorter delay for faster response
      renderGhostText: GhostText,
      
      // Function to generate suggestions
      getSuggestion: async ({ editor, at, text, open }: GetSuggestionParams) => {
        try {
          if (!open) return;
          
          log("Generating suggestion");
          let prompt = "";
          
          // Get current text content
          const contextEntry = editor.api.block({ highest: true });
          
          if (!contextEntry || !contextEntry[0]) {
            log("No context found");
            return;
          }
          
          prompt = serializeMdNodes([contextEntry[0] as TElement]);
          log("Got prompt:", prompt);
          
          // Call our Convex backend
          log("Calling OpenAI via Convex");
          const result = await convex.action(api.openai.completeText, { prompt });
          
          if (!result || !result.text) {
            log("No valid suggestion received");
            return;
          }
          
          const completionText = stripMarkdown(result.text);
          log("Got suggestion:", completionText);
          
          return {
            text: completionText,
          };
        } catch (error) {
          console.error("Error generating suggestion:", error);
          return {
            text: "",
          };
        }
      },
      
      // Alternative approach using the completeOptions
      completeOptions: {
        api: "/api/non-existent-endpoint", // Will trigger onError to use our Convex implementation
        body: {
          system: `You are an advanced AI writing assistant, similar to VSCode Copilot but for general text. Your task is to predict and generate the next part of the text based on the given context.
  
Rules:
- Continue the text naturally up to the next punctuation mark.
- Maintain style and tone. Don't repeat given text.
- For unclear context, provide the most likely continuation.
- Handle code snippets, lists, or structured text if needed.
- CRITICAL: Always end with a punctuation mark.
- CRITICAL: Avoid starting a new block.`,
        },
        onError: async () => {
          try {
            log("fallback: Using Convex API directly");
            
            // Get current context from editor
            const contextEntry = editorApi.block({ highest: true });
            let prompt = "";

            if (contextEntry) {
              prompt = serializeMdNodes([contextEntry[0] as TElement]);
              log("fallback: Got prompt:", prompt);
            } else {
              log("fallback: No context found");
              return;
            }

            // Call Convex action for text completion
            log("fallback: Calling OpenAI via Convex");
            const result = await convex.action(api.openai.completeText, {
              prompt,
            });

            // Process result
            if (result && result.text) {
              const cleanText = stripMarkdown(result.text);
              log("fallback: Got suggestion:", cleanText);
              
              // Set the completion as the suggestion
              editorApi.copilot.setBlockSuggestion({
                text: cleanText,
              });
            } else {
              log("fallback: No valid suggestion received");
            }
          } catch (error) {
            console.error("Error calling Convex action:", error);
          }
        },
        onFinish: (_, completion) => {
          if (completion === "0") return;
          
          const cleanText = stripMarkdown(completion);
          log("onFinish: Setting suggestion:", cleanText);
          
          editorApi.copilot.setBlockSuggestion({
            text: cleanText,
          });
        },
      },
      
      // Function to get the prompt text for the API call
      getPrompt: ({ editor }: { editor: PlateEditor }) => {
        const contextEntry = editor.api.block({ highest: true });

        if (!contextEntry) {
          log("getPrompt: No context found");
          return "";
        }

        const prompt = serializeMdNodes([contextEntry[0] as TElement]);
        log("getPrompt: Generated prompt:", prompt);

        return `Continue the following text:
"""
${prompt}
"""`;
      },
    } as CopilotSuggestionOptions,
  })),
] as const;