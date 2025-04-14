'use client';

import React from 'react';
import { createPlatePlugin } from '@udecode/plate/react';
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";
import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Connect to Convex backend for OpenAI API calls
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "");

// Debug flag for logging
const DEBUG = true;

// Define types for our state
interface CopilotState {
  isActive: boolean;
  isLoading: boolean;
  suggestions: string[];
  currentSuggestionIndex: number;
  currentText: string;
  blockSuggestions: Record<string, string>;
}

// Define an extended editor type to use in our functions
interface ExtendedEditor {
  copilotState?: CopilotState;
  copilot?: {
    setBlockSuggestion: (params: { text: string }) => void;
  };
  api?: {
    block: (options: { highest: boolean }) => any;
  };
  getFragment?: () => any;
  insertText?: (text: string) => void;
  selection?: any;
}

function log(...args: any[]) {
  if (DEBUG) {
    console.log("[Copilot]", ...args);
  }
}

// Create the plugin with proper structure for Plate
export const createCopilotPlugin = () => {
  log('Creating copilot plugin');
  
  return createPlatePlugin({
    key: 'copilot',
    handlers: {
      onKeyDown: (editor, event, next) => {
        // Don't run if no editor or no event
        if (!editor || !event) return next();
        
        // Ensure we have our state on the editor
        const extEditor = editor as unknown as ExtendedEditor;
        if (!extEditor.copilotState) {
          extEditor.copilotState = {
            isActive: false,
            isLoading: false,
            suggestions: [],
            currentSuggestionIndex: 0,
            currentText: '',
            blockSuggestions: {},
          };
        }
        
        // SHORTCUT 1: Ctrl+Space - Generate suggestion
        if ((event.ctrlKey || event.metaKey) && 
            (event.code === 'Space' || event.key === ' ' || event.keyCode === 32)) {
          log('Ctrl+Space detected!');
          event.preventDefault();
          generateSuggestion(extEditor);
          return true;
        }
        
        // SHORTCUT 2: Tab - Accept entire suggestion
        if (event.key === 'Tab' && extEditor.copilotState.isActive) {
          log('Tab detected with active suggestion');
          event.preventDefault();
          acceptSuggestion(extEditor);
          return true;
        }
        
        // SHORTCUT 3: Cmd/Ctrl+Right - Accept word by word
        if ((event.metaKey || event.ctrlKey) && 
            event.key === 'ArrowRight' && 
            extEditor.copilotState.isActive) {
          log('Ctrl+Right detected with active suggestion');
          event.preventDefault();
          acceptWord(extEditor);
          return true;
        }
        
        // SHORTCUT 4: Escape - Cancel suggestion
        if (event.key === 'Escape' && extEditor.copilotState.isActive) {
          log('Escape detected with active suggestion');
          event.preventDefault();
          cancelSuggestion(extEditor);
          return true;
        }
        
        // If typing while suggestion is active, cancel it
        if (extEditor.copilotState.isActive && 
            !event.ctrlKey && !event.metaKey && 
            event.key.length === 1) {
          cancelSuggestion(extEditor);
        }
        
        // Continue with normal keydown handling
        return next();
      },
    },
    options: {
      // Function to check if element is suggested
      isSuggested: (id: string) => {
        const editor = (window as any).__PLATE_EDITOR__ as ExtendedEditor;
        if (!editor?.copilotState?.blockSuggestions) return false;
        return !!editor.copilotState.blockSuggestions[id];
      },
      
      // Function to get suggestion text
      suggestionText: () => {
        const editor = (window as any).__PLATE_EDITOR__ as ExtendedEditor;
        if (!editor?.copilotState?.isActive) return '';
        
        const activeElement = editor.selection?.anchor?.path?.[0];
        if (activeElement !== undefined && editor.copilotState.blockSuggestions) {
          return editor.copilotState.blockSuggestions[activeElement] || '';
        }
        
        return editor.copilotState.currentText || '';
      }
    },
    plugin: {
      copilot: {
        setBlockSuggestion: ({ text }: { text: string }) => {
          const editor = (window as any).__PLATE_EDITOR__ as ExtendedEditor;
          if (!editor) return;
          
          if (!editor.copilotState) {
            editor.copilotState = {
              isActive: false,
              isLoading: false,
              suggestions: [],
              currentSuggestionIndex: 0,
              currentText: '',
              blockSuggestions: {},
            };
          }
          
          // Update state
          const activeElement = editor.selection?.anchor?.path?.[0];
          if (activeElement !== undefined) {
            // Store suggestion by block ID
            editor.copilotState.blockSuggestions = {
              ...editor.copilotState.blockSuggestions,
              [activeElement]: text,
            };
            
            editor.copilotState.isActive = true;
            editor.copilotState.currentText = text;
            
            // Force update via selection change to refresh the UI
            const currentSelection = { ...editor.selection };
            editor.selection = null;
            setTimeout(() => {
              editor.selection = currentSelection;
            }, 0);
          }
        }
      }
    }
  });
};

// Helper functions
const generateSuggestion = async (editor: ExtendedEditor) => {
  try {
    log('Generating suggestion');
    let prompt = '';
    
    // Extract content from editor
    if (typeof editor.api?.block === 'function') {
      const contextEntry = editor.api.block({ highest: true });
      if (contextEntry && contextEntry[0]) {
        prompt = serializeMdNodes([contextEntry[0]]);
        log('Got prompt from block API:', prompt);
      }
    } else if (typeof editor.getFragment === 'function') {
      const fragment = editor.getFragment();
      if (fragment && fragment[0]) {
        prompt = serializeMdNodes([fragment[0]]);
        log('Got prompt from fragment:', prompt);
      }
    }
    
    if (!prompt) {
      log('No prompt text extracted');
      return;
    }
    
    // Update state
    if (!editor.copilotState) return;
    editor.copilotState.isActive = true;
    editor.copilotState.isLoading = true;
    
    // Call API
    log('Calling OpenAI via Convex');
    const result = await convex.action(api.openai.completeText, { prompt });
    
    // Process result
    if (result && result.text) {
      const cleanText = stripMarkdown(result.text);
      log('Got suggestion:', cleanText);
      if (!editor.copilotState) return;
      editor.copilotState.isLoading = false;
      editor.copilotState.suggestions = [cleanText];
      editor.copilotState.currentText = cleanText;
      
      // Update block-specific suggestion
      if (editor.copilot?.setBlockSuggestion) {
        editor.copilot.setBlockSuggestion({ text: cleanText });
      }
    } else {
      log('No valid suggestion received');
      cancelSuggestion(editor);
    }
  } catch (error) {
    console.error('Error generating suggestion:', error);
    cancelSuggestion(editor);
  }
};

const acceptSuggestion = (editor: ExtendedEditor) => {
  if (!editor.copilotState?.isActive || !editor.copilotState.currentText) return;
  
  log('Accepting suggestion:', editor.copilotState.currentText);
  
  if (typeof editor.insertText === 'function') {
    editor.insertText(editor.copilotState.currentText);
    log('Inserted text');
  }
  
  cancelSuggestion(editor);
};

const acceptWord = (editor: ExtendedEditor) => {
  if (!editor.copilotState?.isActive || !editor.copilotState.currentText) return;
  
  const words = editor.copilotState.currentText.split(/\s+/);
  const firstWord = words[0];
  
  if (!firstWord) return;
  
  log('Accepting word:', firstWord);
  
  if (typeof editor.insertText === 'function') {
    editor.insertText(firstWord + ' ');
    log('Inserted word');
  }
  
  const remainingText = words.slice(1).join(' ');
  
  if (remainingText) {
    editor.copilotState.currentText = remainingText;
    
    // Update block suggestion
    const activeElement = editor.selection?.anchor?.path?.[0];
    if (activeElement !== undefined) {
      editor.copilotState.blockSuggestions = {
        ...editor.copilotState.blockSuggestions,
        [activeElement]: remainingText,
      };
    }
    
    // Force update to refresh UI
    const currentSelection = { ...editor.selection };
    editor.selection = null;
    setTimeout(() => {
      editor.selection = currentSelection;
    }, 0);
  } else {
    cancelSuggestion(editor);
  }
};

const cancelSuggestion = (editor: ExtendedEditor) => {
  if (!editor.copilotState) return;
  
  editor.copilotState.isActive = false;
  editor.copilotState.isLoading = false;
  editor.copilotState.suggestions = [];
  editor.copilotState.currentText = '';
  
  // Clear block suggestions
  if (editor.copilotState.blockSuggestions) {
    editor.copilotState.blockSuggestions = {};
  }
  
  // Force update to refresh UI
  if (editor.selection) {
    const currentSelection = { ...editor.selection };
    editor.selection = null;
    setTimeout(() => {
      editor.selection = currentSelection;
    }, 0);
  }
};

// Create and export the plugin
export const CopilotPlugin = createCopilotPlugin();

// Export as an array for easy import
export const copilotPlugins = [CopilotPlugin];

export default copilotPlugins;