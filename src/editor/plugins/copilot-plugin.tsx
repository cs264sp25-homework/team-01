'use client';

import React, { useCallback, useState } from 'react';
import { createPlatePlugin } from '@udecode/plate/react';
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";
import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Connect to Convex backend for OpenAI API calls
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "");
console.log("Convex URL:", import.meta.env.VITE_CONVEX_URL || "Not set");

// Debug flag for logging
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log("[Copilot]", ...args);
  }
}

// Create a custom ghost text component that doesn't depend on the plugin options
const CustomGhostText = ({ text }: { text: string }) => {
  if (!text) return null;
  
  return (
    <span
      className="pointer-events-none text-muted-foreground/70 max-sm:hidden inline-block"
      contentEditable={false}
      style={{
        color: 'rgba(100, 100, 100, 0.8)',
        fontStyle: 'italic',
        marginLeft: '1px',
      }}
    >
      {text}
    </span>
  );
};

// Custom hook to manage copilot state globally
const useCopilotState = () => {
  const [state, setState] = useState({
    isActive: false,
    isLoading: false,
    currentText: '',
    blockId: ''
  });
  
  const setGhostText = useCallback((text: string, blockId: string = '') => {
    setState(prev => ({
      ...prev,
      isActive: !!text,
      currentText: text,
      blockId
    }));
  }, []);
  
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);
  
  return { state, setGhostText, setLoading };
};

// Global state for easier access
let globalState = {
  isActive: false,
  isLoading: false,
  currentText: '',
  blockId: '',
};

let setGlobalGhostText = (text: string, blockId: string = '') => {
  globalState = {
    ...globalState,
    isActive: !!text,
    currentText: text,
    blockId
  };
};

let setGlobalLoading = (loading: boolean) => {
  globalState = {
    ...globalState,
    isLoading: loading
  };
};

// Main renderer component
const CopilotRenderer = () => {
  const [ghostText, setGhostText] = useState('');
  
  // Test Convex connection on mount
  React.useEffect(() => {
    const testConvexConnection = async () => {
      try {
        log('Testing Convex connection...');
        // Use a simple prompt that simulates real usage
        const testPrompt = "Hello. This is a test of the copilot feature.";
        log('Test prompt:', testPrompt);
        
        const testResult = await convex.action(api.openai.completeText, { 
          prompt: testPrompt
        });
        log('Convex test result:', testResult);
        
        if (testResult && testResult.text) {
          log('✅ Convex connection working! Response: ' + testResult.text);
        } else {
          log('⚠️ Convex connection returned empty result');
        }
      } catch (error) {
        console.error('❌ Convex connection failed:', error);
      }
    };
    
    testConvexConnection();
  }, []);
  
  // Set up event listeners
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get the editor from the global scope
      const editor = (window as any).__PLATE_EDITOR__;
      if (!editor) {
        log('No editor found in window.__PLATE_EDITOR__');
        return;
      }
      
      // Log editor state on every key press in debug mode
      if (DEBUG) {
        try {
          log('Editor has active selection:', !!editor.selection);
          if (editor.selection) {
            log('Selection path:', JSON.stringify(editor.selection.anchor?.path));
          }
        } catch (err) {
          // Ignore errors in debug logging
        }
      }
      
      // SHORTCUT 1: Ctrl+Space - Generate suggestion
      if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
        log('Ctrl+Space detected!');
        e.preventDefault();
        
        // Show a loading indicator
        setGhostText('⏳ Generating...');
        globalState.isActive = true;
        globalState.isLoading = true;
        
        // Get the HTML content of the editor as a fallback
        try {
          const editorElements = document.querySelectorAll('[contenteditable="true"]');
          if (editorElements.length > 0) {
            log('Found contenteditable elements:', editorElements.length);
            for (const el of editorElements) {
              log('Content editable element text:', el.textContent);
            }
          }
        } catch (error) {
          log('Error checking contenteditable elements:', error);
        }
        
        generateSuggestion(editor).then(text => {
          if (text) {
            log('Setting ghost text to:', text);
            setGhostText(text);
            globalState.currentText = text;
            globalState.isActive = true;
            globalState.isLoading = false;
          } else {
            log('No text generated, clearing ghost text');
            setGhostText('');
            globalState.currentText = '';
            globalState.isActive = false;
            globalState.isLoading = false;
          }
        }).catch(error => {
          console.error('Error generating suggestion:', error);
          setGhostText('❌ Failed to generate text');
          setTimeout(() => {
            setGhostText('');
            globalState.currentText = '';
            globalState.isActive = false;
            globalState.isLoading = false;
          }, 2000);
        });
        return;
      }
      
      // Only handle these shortcuts if we have active ghost text
      if (!globalState.isActive || !globalState.currentText) return;
      
      // SHORTCUT 2: Tab - Accept entire suggestion
      if (e.key === 'Tab') {
        log('Tab detected with active suggestion');
        e.preventDefault();
        
        if (typeof editor.insertText === 'function') {
          editor.insertText(globalState.currentText);
          log('Inserted text');
        }
        
        setGhostText('');
        globalState.currentText = '';
        globalState.isActive = false;
        return;
      }
      
      // SHORTCUT 3: Cmd/Ctrl+Right - Accept word by word
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
        log('Ctrl+Right detected with active suggestion');
        e.preventDefault();
        
        const words = globalState.currentText.split(/\s+/);
        const firstWord = words[0];
        
        if (!firstWord) return;
        
        if (typeof editor.insertText === 'function') {
          editor.insertText(firstWord + ' ');
          log('Inserted word');
        }
        
        const remainingText = words.slice(1).join(' ');
        
        if (remainingText) {
          globalState.currentText = remainingText;
          setGhostText(remainingText);
        } else {
          globalState.currentText = '';
          globalState.isActive = false;
          setGhostText('');
        }
        return;
      }
      
      // SHORTCUT 4: Escape - Cancel suggestion
      if (e.key === 'Escape') {
        log('Escape detected with active suggestion');
        e.preventDefault();
        
        globalState.currentText = '';
        globalState.isActive = false;
        setGhostText('');
        return;
      }
      
      // If typing normally, cancel the suggestion
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        globalState.currentText = '';
        globalState.isActive = false;
        setGhostText('');
      }
    };
    
    // Add the event listener to the document
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setGhostText]);
  
  return ghostText ? <CustomGhostText text={ghostText} /> : null;
};

// Helper function to generate a suggestion
const generateSuggestion = async (editor: any): Promise<string> => {
  try {
    log('Generating suggestion');
    let prompt = '';
    
    // Debug editor object structure
    try {
      log('Editor object keys:', Object.keys(editor).join(', '));
      if (editor.selection) log('Has selection:', editor.selection);
      if (editor.children) log('Has children, count:', editor.children.length);
      if (editor.api) log('Has API with methods:', Object.keys(editor.api).join(', '));
    } catch (e) {
      log('Failed to debug editor object:', e);
    }
    
    // Extract content from editor
    if (typeof editor.api?.block === 'function') {
      try {
        const contextEntry = editor.api.block({ highest: true });
        if (contextEntry && contextEntry[0]) {
          prompt = serializeMdNodes([contextEntry[0]]);
          log('Got prompt from block API:', prompt);
        }
      } catch (err) {
        log('Error using block API:', err);
      }
    }

    // Try getting the current editor value
    if (!prompt && editor.children) {
      try {
        log('Trying to serialize editor.children');
        // This approach worked in the original plugin
        const nodes = Array.isArray(editor.children) ? editor.children : [];
        prompt = serializeMdNodes(nodes);
        log('Got prompt from serializing editor.children:', prompt);
      } catch (err) {
        log('Error serializing editor.children:', err);
      }
    }

    // Try to get text content directly from DOM
    if (!prompt) {
      try {
        log('Trying to get content from DOM');
        const editableElements = document.querySelectorAll('[data-slate-editor="true"]');
        if (editableElements.length > 0) {
          const content = editableElements[0].textContent || '';
          if (content.trim()) {
            prompt = content.trim();
            log('Got content from DOM:', prompt);
          }
        }
      } catch (err) {
        log('Error getting content from DOM:', err);
      }
    }

    // Simple fallback: just get any text we can from editor.children
    if (!prompt && editor.children) {
      try {
        const extractText = (node: any): string => {
          if (typeof node === 'string') return node;
          if (!node) return '';
          
          // Handle text node
          if (node.text) return node.text;
          
          // Handle block with children
          if (Array.isArray(node.children)) {
            return node.children.map(extractText).join(' ');
          }
          
          return '';
        };
        
        // Extract text from all children
        prompt = editor.children.map(extractText).filter(Boolean).join('\n');
        log('Got text directly from children:', prompt);
      } catch (err) {
        console.error('Error extracting text from editor.children:', err);
      }
    }
    
    // Fall back to getting the selected text if available
    if (!prompt && typeof window.getSelection === 'function') {
      log('Trying to get selected text');
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        prompt = selection.toString();
        log('Got selected text:', prompt);
      }
    }
    
    if (!prompt) {
      log('No prompt text extracted');
      return '';
    }
    
    // Make sure prompt is not empty
    prompt = prompt.trim();
    if (!prompt) {
      prompt = "Please continue this text:";
    }
    
    // Update loading state
    setGlobalLoading(true);
    
    // Call API
    log('Calling OpenAI via Convex with prompt:', prompt);
    try {
      // Format the prompt more clearly
      const formattedPrompt = prompt.trim();
      
      log('Formatted prompt:', formattedPrompt);
      
      // The actual API call - this is how the original plugin worked
      log('Sending API request...');
      const result = await convex.action(api.openai.completeText, { 
        prompt: formattedPrompt 
      });
      
      log('API result:', result);
      
      // Process result
      setGlobalLoading(false);
      
      if (result && result.text) {
        const cleanText = stripMarkdown(result.text);
        log('Got suggestion:', cleanText);
        return cleanText;
      } else {
        log('No valid suggestion received from API');
        return '';
      }
    } catch (apiError) {
      console.error('API call error:', apiError);
      setGlobalLoading(false);
      return '';
    }
  } catch (error) {
    console.error('Error generating suggestion:', error);
    setGlobalLoading(false);
    return '';
  }
};

// Create the plugin with simpler structure
export const createCopilotPlugin = () => {
  log('Creating copilot plugin');
  
  return createPlatePlugin({
    key: 'copilot',
    render: {
      // Place the ghost text after the editable area
      afterEditable: () => <CopilotRenderer />
    }
  });
};

// Create and export the plugin
export const CopilotPlugin = createCopilotPlugin();

// Export as an array for easy import
export const copilotPlugins = [CopilotPlugin];

export default copilotPlugins;