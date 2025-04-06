"use client";

import type { TElement } from "@udecode/plate";
import { CopilotPlugin } from "@udecode/plate-ai/react";
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";

import { ConvexReactClient } from "convex/react";
import { api } from "../../../../convex/_generated/api";

import { GhostText } from "@/components/plate-ui/ghost-text";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "");

//need to change this with convex api.. can do vercel ai here or move idk..
export const copilotPlugins = [
  CopilotPlugin.configure(({ api: editorApi }) => ({
    options: {
      completeOptions: {
        api: "/api/non-existent-endpoint", // Purposely use a non-existent endpoint to trigger onError
        body: {
          system: `You are an advanced AI writing assistant, similar to VSCode Copilot but for general text. Your task is to predict and generate the next part of the text based on the given context.
  
  Rules:
  - Continue the text naturally up to the next punctuation mark (., ,, ;, :, ?, or !).
  - Maintain style and tone. Don't repeat given text.
  - For unclear context, provide the most likely continuation.
  - Handle code snippets, lists, or structured text if needed.
  - Don't include """ in your response.
  - CRITICAL: Always end with a punctuation mark.
  - CRITICAL: Avoid starting a new block. Do not use block formatting like >, #, 1., 2., -, etc. The suggestion should continue in the same block as the context.
  - If no context is provided or you can't generate a continuation, return "0" without explanation.`,
        },
        onError: async () => {
          try {
            // Get current context from editor
            const contextEntry = editorApi.block({ highest: true });
            let prompt = "";

            if (contextEntry) {
              prompt = serializeMdNodes([contextEntry[0] as TElement]);
            }

            // Call Convex action for text completion
            const result = await convex.action(api.openai.completeText, {
              prompt,
            });

            // Set the completion as the suggestion
            editorApi.copilot.setBlockSuggestion({
              text: stripMarkdown(result.text),
            });
          } catch (error) {
            console.error("Error calling Convex action:", error);

            // Fallback if the action fails
            editorApi.copilot.setBlockSuggestion({
              text: "Failed to generate suggestion...",
            });
          }
        },
        onFinish: (_, completion) => {
          if (completion === "0") return;

          editorApi.copilot.setBlockSuggestion({
            text: stripMarkdown(completion),
          });
        },
      },
      debounceDelay: 500,
      renderGhostText: GhostText,
      getPrompt: ({ editor }) => {
        const contextEntry = editor.api.block({ highest: true });

        if (!contextEntry) return "";

        const prompt = serializeMdNodes([contextEntry[0] as TElement]);

        return `Continue the text up to the next punctuation mark:
  """
  ${prompt}
  """`;
      },
    },
  })),
] as const;
