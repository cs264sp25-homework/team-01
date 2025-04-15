'use client';

import { useAction } from 'convex/react';
import { useChat as useBaseChat } from 'ai/react';
import { api } from '../../../convex/_generated/api';
import { useEditorRef } from '@udecode/plate/react';

export const useChat = () => {
  // Get the Convex action
  const processAICommand = useAction(api.openai.processAICommand);
  const editor = useEditorRef();
  
  //todo figure out how to do this without useBaseChat cus deprecated
  return useBaseChat({
    id: 'editor',
    api: '/api/ai/command',
    body: {},
    fetch: async (input, init) => {
      try {
        // Extract the prompt data from the request
        const body = init?.body ? JSON.parse(init.body.toString()) : {};
        const { prompt, messages } = body;
        
        // Determine the command type from the last message
        const lastMessage = messages?.[messages.length - 1]?.content || prompt || '';
        const commandType = determineCommandType(lastMessage);
        
        // Get editor content if available
        let editorContent = '';
        
        if (editor && editor.children) {
          // Get the current editor content
          editorContent = JSON.stringify(editor.children);
        }
        
        // Call the Convex action with the prompt and command type
        const result = await processAICommand({
          prompt: lastMessage,
          commandType,
          editorContent: editorContent || undefined
        });
        
        // Convert the response to a readable stream in the format expected by the AI SDK
        return createResponseFromText(result.text);
      } catch (error) {
        console.error("Error calling AI command:", error);
        return new Response(JSON.stringify({ error: "Failed to process AI command" }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    },
  });
};

// Helper to determine the type of command from the prompt text
function determineCommandType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('improve writing')) return 'improveWriting';
  if (lowerPrompt.includes('summarize') || lowerPrompt.includes('add a summary')) return 'summarize';
  if (lowerPrompt.includes('make shorter')) return 'makeShorter';
  if (lowerPrompt.includes('make longer')) return 'makeLonger';
  if (lowerPrompt.includes('fix spelling') || lowerPrompt.includes('grammar')) return 'fixSpelling';
  if (lowerPrompt.includes('continue writing')) return 'continueWrite';
  
  // Default to generic improvement
  return 'improveWriting';
}

// Helper to create a readable stream from text, formatted for the AI SDK
function createResponseFromText(text: string) {
  const encoder = new TextEncoder();
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        // Stream the text with the correct format
        controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
        
        // Add the finish event
        controller.enqueue(
          encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":${text.length}}}\n`)
        );
        
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain',
        'Connection': 'keep-alive',
      },
    }
  );
}
