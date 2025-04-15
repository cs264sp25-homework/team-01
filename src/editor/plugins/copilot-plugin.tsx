'use client';

import React from 'react';
import { createPlatePlugin } from '@udecode/plate/react';
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";
import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GhostText } from "@/plate-ui/ghost-text";

// Connect to Convex backend for OpenAI API calls
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "");

// Create global variables to store state
let isActive = false;
let currentText = '';
let blockSuggestions: Record<string, string> = {};
let lastGenerationTime = 0;
let runningRequest = false;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let editorReference: any = null;

// Expose variables globally for ghost-text.tsx
if (typeof window !== 'undefined') {
  (window as any).ghostTextIsActive = false;
  (window as any).ghostTextCurrentText = '';
  (window as any).ghostTextSuggestions = {};
  
  // Store editor reference globally for direct access
  (window as any).__STORE_EDITOR_REF__ = (editor: any) => {
    if (editor) {
      editorReference = editor;
      console.log('[Copilot] Stored editor reference');
    }
  };
  
  // Reset function to clear ghost text state
  (window as any).resetGhostText = () => {
    isActive = false;
    currentText = '';
    blockSuggestions = {};
    
    // Update global variables
    (window as any).ghostTextIsActive = false;
    (window as any).ghostTextCurrentText = '';
    (window as any).ghostTextSuggestions = {};
    
    // Force refresh editor
    const editor = getEditorInstance();
    if (editor && editor.selection) {
      const oldSelection = { ...editor.selection };
      editor.selection = null;
      setTimeout(() => {
        editor.selection = oldSelection;
      }, 0);
    }
    
    return true;
  };
}

// Function to find the current editor instance
function getEditorInstance() {
  // Try the saved reference first
  if (editorReference) {
    console.log('[Copilot] Using stored editor reference');
    return editorReference;
  }
  
  // Try the global reference next
  const globalEditor = (window as any).__PLATE_EDITOR__;
  if (globalEditor) {
    console.log('[Copilot] Using global __PLATE_EDITOR__ reference');
    editorReference = globalEditor;
    return globalEditor;
  }

  // Try to find editor components
  try {
    // Try using ReactDOM to access the editor component
    const editableElements = document.querySelectorAll('[contenteditable="true"][data-slate-editor="true"]');
    console.log('[Copilot] Found slate editor elements:', editableElements.length);
    
    if (editableElements.length > 0) {
      // Try to find the React fiber
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('[Copilot] Attempting to find React component for editor');
        // TODO: This is just a hint for a possible improvement
      }
    }
  } catch (e) {
    console.error('[Copilot] Error finding editor components:', e);
  }

  return null;
}

// Direct text insertion function that doesn't require editor instance
function directInsertText(text: string) {
  console.log('[Copilot] Attempting direct text insertion:', text);
  try {
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.error('[Copilot] No selection available for direct text insertion');
      return false;
    }
    
    // Get the current range
    const range = selection.getRangeAt(0);
    
    // Create and insert text node
    const textNode = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(textNode);
    
    // Position cursor after inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Try to find the editor element
    const editorElement = document.querySelector('[data-slate-editor="true"]');
    if (editorElement) {
      // Trigger input event to notify editor of changes
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: text
      });
      editorElement.dispatchEvent(inputEvent);
      
      // Also dispatch a change event
      const changeEvent = new Event('change', {
        bubbles: true
      });
      editorElement.dispatchEvent(changeEvent);
    }
    
    console.log('[Copilot] Direct text insertion succeeded');
    return true;
  } catch (e) {
    console.error('[Copilot] Direct text insertion failed:', e);
    return false;
  }
}

// Generate a real suggestion based on note content
async function generateSuggestion(prompt: string) {
  if (runningRequest) {
    return;
  }
  
  if (!prompt || prompt.length < 5) {
    return;
  }
  
  // Throttle API calls (max one every 1 second)
  const now = Date.now();
  if (now - lastGenerationTime < 1000) {
    return;
  }
  
  // Set flags
  runningRequest = true;
  lastGenerationTime = now;
  
  try {
    // Call OpenAI via Convex backend
    const result = await convex.action(api.openai.completeText, { prompt });
    
    if (result && result.text) {
      // Clean up markdown if present
      const suggestion = stripMarkdown(result.text);
      
      // Update active state
      isActive = true;
      currentText = suggestion;
      
      // Update global variables for ghost-text.tsx
      (window as any).ghostTextIsActive = true;
      (window as any).ghostTextCurrentText = suggestion;
      
      // Get editor to find current block
      const editor = getEditorInstance();
      if (editor && editor.selection) {
        // Find the block ID from selection
        const path = editor.selection.anchor?.path;
        if (path && path[0] !== undefined) {
          const blockId = String(path[0]);
          
          // Update block suggestions
          blockSuggestions[blockId] = suggestion;
          
          // Update global variable
          (window as any).ghostTextSuggestions = { ...blockSuggestions };
          
          // Force editor refresh to show suggestion
          try {
            const oldSelection = { ...editor.selection };
            editor.selection = null;
            setTimeout(() => {
              editor.selection = oldSelection;
            }, 0);
          } catch (e) {
            // Error refreshing editor
          }
        }
      } else {
        // As a fallback, store the suggestion for block 0
        blockSuggestions['0'] = suggestion;
        (window as any).ghostTextSuggestions = { ...blockSuggestions };
      }

      // Try direct DOM injection since React method might not be working
      if (isActive && suggestion) {
        // Wait a moment for React to attempt rendering
        setTimeout(() => {
          // Check if we see any ghost-text-content elements rendered
          const ghostTextElements = document.querySelectorAll('.ghost-text-content');
          if (ghostTextElements.length === 0) {
            if (typeof (window as any).injectGhostText === 'function') {
              (window as any).injectGhostText(suggestion);
            }
          }
        }, 100);
      }
    }
  } catch (error) {
    console.error('Error generating suggestion:', error);
  } finally {
    runningRequest = false;
  }
}

// Schedule regular checks for the editor
function startEditorChecks() {
  // Try to find editor reference
  let checkAttempts = 0;
  
  const checkForEditor = () => {
    const editor = getEditorInstance();
    if (editor) {
      editorReference = editor;
      
      // Generate an initial suggestion
      try {
        if (editor.api?.block) {
          const block = editor.api.block({ highest: true });
          if (block && block[0]) {
            const content = serializeMdNodes([block[0]]);
            if (content && content.length > 10) {
              generateSuggestion(content);
            }
          }
        }
      } catch (e) {
        // Error during initial suggestion
      }
    } else {
      checkAttempts++;
      if (checkAttempts < 30) {  // Try for 30 seconds max
        setTimeout(checkForEditor, 1000);
      }
    }
  };
  
  // Start checking
  setTimeout(checkForEditor, 1000);
}

// Create the plugin
export const createCopilotPlugin = () => {
  // Initialize only once
  if (typeof window !== 'undefined' && !window.__COPILOT_INITIALIZED__) {
    window.__COPILOT_INITIALIZED__ = true;
    
    // Start editor checks
    startEditorChecks();
    
    // Add global tab key interceptor with highest priority
    document.addEventListener('keydown', (e) => {
      // Only handle tab when suggestion is active
      if (e.key === 'Tab' && isActive) {
        console.log('[Copilot] Intercepting Tab key with highest priority');
        
        // Stop all other handlers from receiving this event
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Get the text to insert
        let textToInsert = currentText;
        const editor = getEditorInstance();
        
        if (editor && editor.selection?.anchor?.path) {
          const blockId = String(editor.selection.anchor.path[0]);
          textToInsert = blockSuggestions[blockId] || currentText;
        }
        
        if (!textToInsert) {
          console.error('[Copilot] No text to insert');
          return false;
        }
        
        // Force executing our handler
        setTimeout(() => {
          // Try direct DOM insertion first (most reliable)
          console.log('[Copilot] Attempting text insertion with text:', textToInsert);
          
          const insertSuccess = directInsertText(textToInsert);
          
          if (insertSuccess) {
            // Clear the suggestion state
            isActive = false;
            currentText = '';
            blockSuggestions = {};
            
            // Update global variables
            (window as any).ghostTextIsActive = false;
            (window as any).ghostTextCurrentText = '';
            (window as any).ghostTextSuggestions = {};
            
            return;
          }
          
          // Fall back to editor API methods
          if (editor) {
            try {
              if (typeof editor.insertText === 'function') {
                editor.insertText(textToInsert);
                console.log('[Copilot] Inserted text via editor.insertText');
              } else if (editor.api?.insertText) {
                editor.api.insertText(textToInsert);
                console.log('[Copilot] Inserted text via editor.api.insertText');
              } else {
                console.error('[Copilot] No method to insert text found on editor');
              }
              
              // Clear the suggestion state
              isActive = false;
              currentText = '';
              blockSuggestions = {};
              
              // Update global variables
              (window as any).ghostTextIsActive = false;
              (window as any).ghostTextCurrentText = '';
              (window as any).ghostTextSuggestions = {};
            } catch (err) {
              console.error('[Copilot] Editor insertion failed:', err);
            }
          }
        }, 0);
        
        return false;
      }
    }, { capture: true });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+G to manually trigger suggestion
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        
        const editor = getEditorInstance();
        if (editor && editor.api?.block) {
          try {
            // Get current block content
            const block = editor.api.block({ highest: true });
            if (block && block[0]) {
              const content = serializeMdNodes([block[0]]);
              generateSuggestion(content);
            }
          } catch (e) {
            // Error getting block content
          }
        } else {
          // Try to find editor element at least
          const editorEl = document.querySelector('[data-slate-editor="true"]');
          if (editorEl) {
            // Try to extract text from the first paragraph for testing
            try {
              const firstParagraph = editorEl.querySelector('p');
              if (firstParagraph) {
                const text = firstParagraph.textContent || '';
                if (text.length > 5) {
                  generateSuggestion(text);
                }
              }
            } catch (e) {
              // Error extracting text from editor element
            }
          }
        }
      }
      
      // Escape to cancel suggestion
      if (e.key === 'Escape' && isActive) {
        e.preventDefault();
        
        // Reset state
        isActive = false;
        currentText = '';
        blockSuggestions = {};
        
        // Update global variables
        (window as any).ghostTextIsActive = false;
        (window as any).ghostTextCurrentText = '';
        (window as any).ghostTextSuggestions = {};
        
        // Force refresh
        const editor = getEditorInstance();
        if (editor && editor.selection) {
          const oldSelection = { ...editor.selection };
          editor.selection = null;
          setTimeout(() => {
            editor.selection = oldSelection;
          }, 0);
        }
      }
    });
    
    // Watch for typing
    document.addEventListener('input', (e) => {
      // Only process if the target is in the editor
      if (!(e.target instanceof Element) || !e.target.closest('[data-slate-editor]')) {
        return;
      }
      
      // Store editor reference if we find it
      const editor = getEditorInstance();
      if (editor) {
        editorReference = editor;
      }
      
      // If active suggestion, cancel it when user types
      if (isActive) {
        isActive = false;
        currentText = '';
        blockSuggestions = {};
      }
      
      // Schedule new suggestion after typing pause
      clearTimeout(typingTimer!);
      typingTimer = setTimeout(() => {
        const currentEditor = getEditorInstance();
        if (currentEditor && currentEditor.api?.block) {
          try {
            const block = currentEditor.api.block({ highest: true });
            if (block && block[0]) {
              const content = serializeMdNodes([block[0]]);
              
              if (content && content.length > 10) {
                generateSuggestion(content);
              }
            }
          } catch (e) {
            // Error checking content after typing
          }
        } else if (e.target instanceof Element) {
          // Try to get text directly from the element
          const text = e.target.textContent || '';
          if (text.length > 10) {
            generateSuggestion(text);
          }
        }
      }, 1000); // Wait 1 second after typing stops
    });
    
    // Initial test of OpenAI API
    setTimeout(async () => {
      try {
        const result = await convex.action(api.openai.completeText, {
          prompt: 'This is a test to verify OpenAI integration is working.'
        });
      } catch (e) {
        // OpenAI API test failed
      }
    }, 2000);
  }
  
  // Create and return plugin
  return createPlatePlugin({
    key: 'copilot',
    options: {
      // Function to check if a block has a suggestion
      isSuggested: (id: string) => {
        const result = isActive && !!blockSuggestions[id];
        return result;
      },
      
      // Function to get the suggestion text
      suggestionText: () => {
        if (!isActive) {
          return '';
        }
        
        // Try to get editor and find current block
        const editor = getEditorInstance();
        if (editor && editor.selection?.anchor?.path) {
          const blockId = String(editor.selection.anchor.path[0]);
          const result = blockSuggestions[blockId] || currentText;
          return result;
        }
        
        // Default to current text
        return currentText;
      },
      
      // Set the GhostText component for rendering
      renderGhostText: GhostText
    }
  });
};

// Add window type extension
declare global {
  interface Window {
    __COPILOT_INITIALIZED__?: boolean;
  }
}

// Create and export the plugin
export const CopilotPlugin = createCopilotPlugin();

// Export as an array for easy import
export const copilotPlugins = [CopilotPlugin];

// Expose a global function to force accept the current suggestion
if (typeof window !== 'undefined') {
  (window as any).acceptCurrentSuggestion = () => {
    if (isActive) {
      const editor = getEditorInstance();
      if (editor) {
        // Find the current block suggestion
        let textToInsert = currentText;
        if (editor.selection?.anchor?.path) {
          const blockId = String(editor.selection.anchor.path[0]);
          textToInsert = blockSuggestions[blockId] || currentText;
        }
          
        // Insert the text - try multiple methods to ensure it works
        if (textToInsert) {
          try {
            console.log('Accepting suggestion via global method:', textToInsert);
            
            // Method 1: Use insertText directly
            if (typeof editor.insertText === 'function') {
              editor.insertText(textToInsert);
            } 
            // Method 2: Use the editor API if available
            else if (editor.api?.insertText) {
              editor.api.insertText(textToInsert);
            }
            // Method 3: Use the Slate API
            else if (editor.insertFragment) {
              const fragment = [{ text: textToInsert }];
              editor.insertFragment(fragment);
            }
            // Method 4: Manual DOM insertion as fallback
            else if (window.getSelection) {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(textToInsert));
              }
            }
            
            // Force editor to update
            setTimeout(() => {
              const event = new Event('input', { bubbles: true });
              document.querySelector('[data-slate-editor="true"]')?.dispatchEvent(event);
            }, 0);
            
            // Reset state
            isActive = false;
            currentText = '';
            blockSuggestions = {};
            
            return true;
          } catch (error) {
            console.error('Error accepting suggestion:', error);
          }
        }
      }
    }
    return false;
  };
}

// Direct DOM injection fallback for ghost text
if (typeof window !== 'undefined') {
  // Helper function to directly inject ghost text into the DOM
  (window as any).injectGhostText = (text: string) => {
    // Find the editor
    const editorEl = document.querySelector('[data-slate-editor="true"]');
    if (!editorEl) {
      return false;
    }
    
    // Remove any existing ghost text elements
    document.querySelectorAll('.direct-ghost-text').forEach(el => el.remove());
    
    // Try multiple strategies to find the right element
    
    // Strategy 1: Find the element with current selection
    const selection = window.getSelection();
    let targetElement = null;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      targetElement = range.endContainer.parentElement;
    }
    
    // Strategy 2: If no selection, try to find element with focus
    if (!targetElement) {
      targetElement = document.querySelector('[data-slate-string="true"]:focus');
    }
    
    // Strategy 3: If still no target, try to find the last text node in the editor
    if (!targetElement) {
      const textNodes = editorEl.querySelectorAll('[data-slate-string="true"]');
      if (textNodes.length > 0) {
        targetElement = textNodes[textNodes.length - 1];
      }
    }
    
    // Strategy 4: If still no target, use the first paragraph
    if (!targetElement) {
      const paragraphs = editorEl.querySelectorAll('[data-slate-node="element"]');
      if (paragraphs.length > 0) {
        // Try to find a text node within the paragraph
        const textNode = paragraphs[0].querySelector('[data-slate-string="true"]');
        targetElement = textNode || paragraphs[0];
      }
    }
    
    // Final fallback: use the editor element itself
    if (!targetElement) {
      targetElement = editorEl;
    }
    
    // Create the ghost text element
    const ghostTextEl = document.createElement('span');
    ghostTextEl.className = 'direct-ghost-text';
    ghostTextEl.textContent = text;
    ghostTextEl.style.color = '#6e7781';
    ghostTextEl.style.backgroundColor = '#f8f9fa';
    ghostTextEl.style.borderRadius = '2px';
    ghostTextEl.style.fontStyle = 'italic';
    ghostTextEl.style.opacity = '0.7';
    ghostTextEl.style.padding = '0 2px';
    ghostTextEl.style.margin = '0 1px';
    ghostTextEl.style.pointerEvents = 'none';
    ghostTextEl.style.display = 'inline-block';
    
    // Insert the ghost text element
    try {
      // Try to insert after the target element
      if (targetElement.parentNode) {
        targetElement.parentNode.insertBefore(ghostTextEl, targetElement.nextSibling);
      } else {
        // If no parent node, try to append to the target directly
        targetElement.appendChild(ghostTextEl);
      }
      
      // Make the ghost text visible by scrolling to it if needed
      ghostTextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      return true;
    } catch (e) {
      // Last resort - append to the editor element directly
      try {
        editorEl.appendChild(ghostTextEl);
        return true;
      } catch (finalError) {
        return false;
      }
    }
  };
  
  // Add a shortcut for the direct injection (Ctrl+Shift+G)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      
      // Use forceCopilotSuggestion to generate a suggestion first
      const success = (window as any).forceCopilotSuggestion();
      
      // If forceCopilotSuggestion worked, don't need to do anything more
      if (success) return;
      
      // Try direct injection with sample text as fallback
      (window as any).injectGhostText(' - this is a directly injected ghost text example');
    }
  });
}

export default copilotPlugins;