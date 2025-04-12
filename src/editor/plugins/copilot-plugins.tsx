"use client";

import { useEffect, useState } from 'react';
import { createPlatePlugin } from '@udecode/plate/react';
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";
import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Connect to our Convex backend which handles the OpenAI API calls
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "");

// State interface for tracking AI suggestions
interface CopilotState {
  isActive: boolean;       // Is the suggestion feature currently active
  isLoading: boolean;      // Is an API call in progress
  suggestions: string[];   // List of all suggestions (we currently just use one)
  currentSuggestionIndex: number;  // Index of current suggestion
  currentText: string;     // Text content of the current suggestion
}

// Renders the ghost text that appears as a suggestion
export function CustomGhostText({ text }: { text: string }) {
  if (!text) return null;
  
  return (
    <span
      className="pointer-events-none text-muted-foreground/70 max-sm:hidden"
      contentEditable={false}
    >
      {text}
    </span>
  );
}

// Create the basic plate plugin shell
export const copilotPlugin = createPlatePlugin({
  key: 'copilot',
  
  // Tell the editor to render our ghost text component
  render: {
    afterEditable: () => <CopilotGhostTextRenderer />,
  },
});

// Extend the plugin with our custom behavior
const initializeCopilot = () => {
  const originalPlugin = copilotPlugin;
  
  // Add keyboard handlers to trigger AI suggestions
  // @ts-ignore - We need to augment the plugin with custom handlers
  originalPlugin.handlers = {
    onKeyDown: (editor, event) => {
      const plateEditor = editor as any;
      
      // Initialize the editor if needed
      if (!plateEditor.copilotState) {
        initializeEditor(plateEditor);
      }
      
      // KEYBOARD SHORTCUT 1: Ctrl+Space - Generate or cycle through suggestions
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        
        const state = plateEditor.copilotState;
        
        if (state?.isActive && state.suggestions?.length > 1) {
          // Cycle through multiple suggestions if available
          const nextIndex = ((state.currentSuggestionIndex || 0) + 1) % state.suggestions.length;
          plateEditor.copilot?.setCurrentSuggestion(nextIndex);
        } else {
          // Generate a new suggestion from OpenAI
          plateEditor.copilot?.generateSuggestion();
        }
        return true;
      }
      
      // KEYBOARD SHORTCUT 2: Tab - Accept entire suggestion
      if (event.key === 'Tab' && plateEditor.copilotState?.isActive) {
        event.preventDefault();
        plateEditor.copilot?.acceptSuggestion();
        return true;
      }
      
      // KEYBOARD SHORTCUT 3: Cmd/Ctrl+Right Arrow - Accept suggestion word by word
      if ((event.metaKey || event.ctrlKey) && event.key === 'ArrowRight' && plateEditor.copilotState?.isActive) {
        event.preventDefault();
        plateEditor.copilot?.acceptWord();
        return true;
      }
      
      // Let other key handlers process the event
      return false;
    }
  };
  
  // Add our initialization function to the plugin
  // @ts-ignore - We need to augment the plugin with withOverrides
  originalPlugin.withOverrides = (editor: any) => {
    initializeEditor(editor);
    return editor;
  };
  
  return originalPlugin;
};

// Setup the editor with our custom state and methods
function initializeEditor(editor: any): void {
  // Initialize state for AI suggestions
  editor.copilotState = {
    isActive: false,
    isLoading: false,
    suggestions: [],
    currentSuggestionIndex: 0,
    currentText: '',
  };
  
  // Add our copilot methods to the editor
  editor.copilot = {
    // This is the main method that generates AI suggestions
    generateSuggestion: async () => {
      try {
        // Step 1: Extract text content from the editor to use as a prompt
        let prompt = "";
        
        // Try to get the current paragraph/block content
        if (typeof editor.api?.block === 'function') {
          const contextEntry = editor.api.block({ highest: true });
          if (contextEntry && contextEntry[0]) {
            // Convert editor nodes to markdown text for the API
            prompt = serializeMdNodes([contextEntry[0]]);
          }
        } else if (typeof editor.getFragment === 'function') {
          const fragment = editor.getFragment();
          if (fragment && fragment[0]) {
            prompt = serializeMdNodes([fragment[0]]);
          }
        }
        
        if (!prompt) return;
        
        // Step 2: Show loading state
        editor.copilot.setState({
          isActive: true,
          isLoading: true,
          suggestions: [],
          currentSuggestionIndex: 0,
          currentText: '',
        });
        
        // Step 3: Call OpenAI through our Convex backend
        // This is the key integration point - it calls the completeText action
        // in convex/openai.ts which makes the actual OpenAI API request
        const result = await convex.action(api.openai.completeText, {
          prompt,
        });
        
        // Step 4: Display the result as ghost text
        if (result.text) {
          editor.copilot.setState({
            isLoading: false,
            suggestions: [stripMarkdown(result.text)],
            currentText: stripMarkdown(result.text),
          });
        }
      } catch (error) {
        console.error("Error generating suggestion:", error);
        // Reset on error
        editor.copilot.setState({
          isActive: false,
          isLoading: false,
          suggestions: [],
          currentText: '',
        });
      }
    },
    
    // Select a specific suggestion from the array
    setCurrentSuggestion: (index: number) => {
      const state = editor.copilotState;
      
      if (!state.suggestions?.length || index >= state.suggestions.length) return;
      
      editor.copilot.setState({
        currentSuggestionIndex: index,
        currentText: state.suggestions[index],
      });
    },
    
    // Tab key handler - accept the entire suggestion at once
    acceptSuggestion: () => {
      const state = editor.copilotState;
      
      if (!state.isActive || !state.currentText) return;
      
      // Insert the suggested text into the editor
      if (typeof editor.insertText === 'function') {
        editor.insertText(state.currentText);
      }
      
      // Reset suggestion state
      editor.copilot.setState({
        isActive: false,
        isLoading: false,
        suggestions: [],
        currentText: '',
      });
    },
    
    // Cmd+Right handler - accept one word at a time
    acceptWord: () => {
      const state = editor.copilotState;
      
      if (!state.isActive || !state.currentText) return;
      
      // Extract words from the suggestion
      const words = state.currentText.split(/\s+/);
      const firstWord = words[0];
      
      if (!firstWord) return;
      
      // Insert just the first word
      if (typeof editor.insertText === 'function') {
        editor.insertText(firstWord + ' ');
      }
      
      // Update state with the remaining words
      const remainingText = words.slice(1).join(' ');
      
      if (remainingText) {
        editor.copilot.setState({
          currentText: remainingText,
        });
      } else {
        // If no words left, reset state
        editor.copilot.setState({
          isActive: false,
          isLoading: false,
          suggestions: [],
          currentText: '',
        });
      }
    },
    
    // Helper to update the copilot state
    setState: (newState: Partial<CopilotState>) => {
      editor.copilotState = {
        ...editor.copilotState,
        ...newState,
      };
    },
  };
}

// React component that displays the ghost text in the editor
export function CopilotGhostTextRenderer() {
  const [ghostText, setGhostText] = useState('');
  const [editor, setEditor] = useState<any>(null);
  
  // Get access to the editor instance
  useEffect(() => {
    // The editor is exposed on the window object by Plate
    const editorInstance = (window as any).__PLATE_EDITOR__;
    if (editorInstance) {
      setEditor(editorInstance);
    }
  }, []);
  
  // Update the ghost text when editor state changes
  useEffect(() => {
    if (!editor) return;
    
    // Initial check for active suggestions
    if (editor.copilotState?.isActive && editor.copilotState.currentText) {
      setGhostText(editor.copilotState.currentText);
    }
    
    // Poll for changes in the editor state
    // This is needed because editor state may change outside React's knowledge
    const interval = setInterval(() => {
      if (editor.copilotState?.isActive && editor.copilotState.currentText) {
        setGhostText(editor.copilotState.currentText);
      } else {
        setGhostText('');
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [editor]);
  
  if (!ghostText) return null;
  
  return <CustomGhostText text={ghostText} />;
}

// Initialize the plugin when this module loads
initializeCopilot();

// Export the plugins array for easy import in the editor configuration
export const copilotPlugins = [copilotPlugin] as const;

/*
HOW THIS CODE WORKS WITH OPENAI:

1. INTEGRATION FLOW:
   - User presses Ctrl+Space in the editor
   - The plugin extracts the current text content
   - Text is sent to Convex backend via api.openai.completeText (line ~138)
   - In convex/openai.ts, the backend calls OpenAI's API with this text
   - OpenAI generates a completion that is sent back through Convex
   - The plugin receives the AI-generated text and shows it as ghost text
   - User can accept it with Tab or incrementally with Cmd+Right

2. ADDING TO YOUR EDITOR:
   - Import the array: import { copilotPlugins } from '@/editor/plugins/copilot-plugins';
   - Add to your plugins: const plugins = [...otherPlugins, ...copilotPlugins];

3. KEYBOARD SHORTCUTS:
   - Ctrl+Space: Generate AI suggestion
   - Tab: Accept entire suggestion
   - Cmd/Ctrl+Right Arrow: Accept one word at a time
   - Ctrl+Z: Undo accepted suggestions
*/
