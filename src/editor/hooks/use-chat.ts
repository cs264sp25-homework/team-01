import { useAction } from 'convex/react';
import { useChat as useBaseChat } from '@ai-sdk/react'
import { api } from '../../../convex/_generated/api';
import { useEditorRef } from '@udecode/plate/react';

export const useChat = () => {
  // Get the Convex action
  const processAICommand = useAction(api.openai.processAICommand);
  const editor = useEditorRef();
  
  return useBaseChat({
    id: 'editor',
    body: {},
    fetch: async (_, init) => {
      try {
        // Extract the prompt data from the request
        const body = init?.body ? JSON.parse(init.body.toString()) : {};
        const { prompt, messages } = body;
        
        console.log("prompt", prompt);
        console.log("messages", messages);
        
        // Determine the command type from the last message
        const lastMessage = messages?.[messages.length - 1]?.content || prompt || '';
        const commandType = determineCommandType(lastMessage);
        
        // Get only the selected block content instead of the entire editor content
        let editorContent = '';
        let selectedContent = '';
        
        if (editor) {
          try {
            // Get the full editor content for reference
            editorContent = JSON.stringify(editor.children);
            
            // Check if there's a selection
            if (editor.selection) {
              // Get the selected blocks
              const selectedBlocks = editor.api.blocks();
              
              if (selectedBlocks.length > 0) {
                // Get only the selected blocks
                const selectedNodes = selectedBlocks.map(([node]) => node);
                
                // Create a subset of the editor content with just the selected blocks
                selectedContent = JSON.stringify(selectedNodes);
                console.log("Selected content:", selectedContent);
              } else {
                // If no blocks are explicitly selected, get the current block
                const currentBlock = editor.api.block({ highest: true });
                
                if (currentBlock) {
                  // Use only the current block
                  selectedContent = JSON.stringify([currentBlock[0]]);
                  console.log("Current block:", selectedContent);
                }
              }
            } else {
              // If no selection, try to get the current block
              const currentBlock = editor.api.block({ highest: true });
              
              if (currentBlock) {
                // Use only the current block
                selectedContent = JSON.stringify([currentBlock[0]]);
                console.log("Current block (no selection):", selectedContent);
              }
            }
          } catch (error) {
            console.error("Error getting selected content:", error);
            // Fall back to using the entire editor content
            selectedContent = editorContent;
          }
        }
 
        console.log("editorContent", editorContent);
        console.log("selectedContent to send:", selectedContent || editorContent);
        
        console.log("Calling AI command:", commandType);
        
        // Call the Convex action with the prompt and command type
        // Use the selected content if available, otherwise fall back to the full editor content
        const result = await processAICommand({
          prompt: lastMessage,
          commandType,
          editorContent: selectedContent || editorContent
        });
        
        console.log("Received result from AI command:", result);
        
        // The AI SDK expects a specific format for the response
        const encoder = new TextEncoder();
        
        return new Response(
          new ReadableStream({
            async start(controller) {
              // Send the full text as a single chunk with the expected format
              controller.enqueue(encoder.encode(`0:${JSON.stringify(result.text)}\n`));
              
              // Add the finish event with metadata in the expected format
              controller.enqueue(
                encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":${result.text.length}}}\n`)
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