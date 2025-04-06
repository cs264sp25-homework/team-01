"use client";

import type { TElement } from "@udecode/plate";
import { CopilotPlugin } from "@udecode/plate-ai/react";
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";
import OpenAI from "openai";

import { GhostText } from "@/components/plate-ui/ghost-text";

//need to change this with convex api.. can do vercel ai here or move idk..

export const copilotPlugins = [
  CopilotPlugin.configure(({ api }) => ({
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
          // Use OpenAI to generate text when API fails
          try {
            // Initialize OpenAI client with environment variable
            const openai = new OpenAI({
              apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
              dangerouslyAllowBrowser: true, // Allow usage in browser
            });

            // Get current context from editor
            const contextEntry = api.block({ highest: true });
            let prompt = "";

            if (contextEntry) {
              prompt = serializeMdNodes([contextEntry[0] as TElement]);
            }

            // Generate completion with OpenAI
            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an advanced AI writing assistant. Continue the text naturally up to the next punctuation mark. Keep it concise and maintain the style and tone.",
                },
                {
                  role: "user",
                  content: `Continue this text: "${prompt}"`,
                },
              ],
              max_tokens: 50,
              temperature: 0.7,
            });

            // Set the completion as the suggestion
            const generatedText =
              completion.choices[0].message.content?.trim() || "";

            api.copilot.setBlockSuggestion({
              text: stripMarkdown(generatedText),
            });
          } catch (error) {
            console.error("Error using OpenAI:", error);

            // Fallback to faker if OpenAI fails
            api.copilot.setBlockSuggestion({
              text: "some open ai issue rn..",
            });
          }
        },
        onFinish: (_, completion) => {
          if (completion === "0") return;

          api.copilot.setBlockSuggestion({
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
