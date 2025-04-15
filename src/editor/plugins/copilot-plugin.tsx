'use client';

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
let editorReference: any = null;

// Helper function to trigger editor change event after text insertion
function triggerEditorChangeEvent() {
  const editor = getEditorInstance();
  
  // Trigger internal slate change detection
  if (editor) {
    try {
      // Force editor to detect change by triggering onChange handler
      if (editor.onChange) {
        editor.onChange();
      }
      
      // Force Slate to normalize the content
      if (editor.normalize) {
        editor.normalize();
      }
      
      // Try different ways to access the Plate onChange handler
      let plateOnChangeFound = false;
      
      // Method 1: Try to access through _node.parent
      if (editor._node?.parent?.props?.onChange) {
        editor._node.parent.props.onChange(editor.children);
        plateOnChangeFound = true;
      }
      
      // Method 2: Look for plate instance on the window
      const plate = (window as any).__PLATE_INSTANCE__;
      if (!plateOnChangeFound && plate?.props?.onChange) {
        plate.props.onChange(editor.children);
        plateOnChangeFound = true;
      }
      
      // Method 3: Try using the handleEditorChange from PlateEditor directly
      if (!plateOnChangeFound && typeof (window as any).__PLATE_EDITOR_HANDLE_CHANGE__ === 'function') {
        (window as any).__PLATE_EDITOR_HANDLE_CHANGE__(editor.children);
        plateOnChangeFound = true;
      }

      // Check DOM for plateEditor component
      if (!plateOnChangeFound) {
        try {
          // Find all keys in window that might contain the PlateEditor instance
          Object.keys(window).forEach(key => {
            if (key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$')) {
              try {
                const possibleInstance = (window as any)[key];
                if (possibleInstance && possibleInstance.stateNode && 
                    possibleInstance.stateNode.props && 
                    typeof possibleInstance.stateNode.props.handleEditorChange === 'function') {
                  possibleInstance.stateNode.props.handleEditorChange();
                  plateOnChangeFound = true;
                }
              } catch (e) {
                // Skip errors in fiber inspection
              }
            }
          });
        } catch (e) {
          // Error searching for PlateEditor in window
        }
      }
      
      // Create and dispatch custom change events
      const event = new Event('input', { bubbles: true });
      document.querySelector('[data-slate-editor="true"]')?.dispatchEvent(event);
      
      // Attempt to trigger handleEditorChange in PlateEditor component
      // This mimics what happens when a user types directly
      const plateEditorHandleChangeEvent = new CustomEvent('plate-editor-change', {
        bubbles: true,
        detail: { content: editor.children }
      });
      document.dispatchEvent(plateEditorHandleChangeEvent);
      
      // Also dispatch direct content change event
      const contentChangeEvent = new CustomEvent('editor-content-changed', {
        bubbles: true,
        detail: { editor, children: editor.children }
      });
      document.dispatchEvent(contentChangeEvent);
      
      // Also try to trigger the normal onChange listeners
      const changeEvent = new Event('change', { bubbles: true });
      document.querySelector('[data-slate-editor="true"]')?.dispatchEvent(changeEvent);
      
      // If we can find the Plate component, trigger its onChange directly
      try {
        const plateElement = document.querySelector('[data-slate-editor]')?.closest('[data-slate-plugin-plate]');
        if (plateElement) {
          const plateEvent = new CustomEvent('plate-change', { 
            bubbles: true,
            detail: { editor, children: editor.children }
          });
          plateElement.dispatchEvent(plateEvent);
        }
      } catch (e) {
        // Error triggering Plate onChange
      }
      
      return true;
    } catch (e) {
      // Error triggering change event
    }
  }
  
  return false;
}

// Expose variables globally for ghost-text.tsx
if (typeof window !== 'undefined') {
  (window as any).ghostTextIsActive = false;
  (window as any).ghostTextCurrentText = '';
  (window as any).ghostTextSuggestions = {};
  
  // Store editor reference globally for direct access
  (window as any).__STORE_EDITOR_REF__ = (editor: any) => {
    if (editor) {
      editorReference = editor;
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
    return editorReference;
  }
  
  // Try the global reference next
  const globalEditor = (window as any).__PLATE_EDITOR__;
  if (globalEditor) {
    editorReference = globalEditor;
    return globalEditor;
  }

  // Try to find editor components
  try {
    // Try using ReactDOM to access the editor component
    const editableElements = document.querySelectorAll('[contenteditable="true"][data-slate-editor="true"]');
    
    if (editableElements.length > 0) {
      // Try to find the React fiber
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        // Placeholder for future implementation
      }
    }
  } catch (e) {
    // Error finding editor components
  }

  return null;
}

// Direct text insertion function that doesn't require editor instance
function directInsertText(text: string) {
  // Try to get the editor instance first
  const editor = getEditorInstance();
  if (editor) {
    try {
      // Use the Slate API directly - this is the most reliable method
      // as it updates the internal data model, not just the DOM
      if (typeof editor.insertText === 'function') {
        editor.insertText(text);
        
        // Make sure the onChange handlers are triggered
        triggerEditorChangeEvent();
        return true;
      }
    } catch (slateError) {
      // Continue to DOM fallback methods
    }
  }
  
  // Fallback to DOM methods if Slate API fails
  try {
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
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
      
      // Try to synchronize the DOM changes back to the Slate model
      if (editor) {
        try {
          // Force Slate to re-read from DOM - this is experimental
          // and may not work in all Slate versions
          if (editor.onChange) {
            editor.onChange();
          }
          // Try using Slate's built-in normalization
          if (editor.normalize) {
            editor.normalize();
          }
        } catch (e) {
          // Error synchronizing DOM to Slate
        }
      }
      
      // Make sure editor change is detected for saving
      setTimeout(() => {
        // Add additional change detection triggers
        triggerEditorChangeEvent();
      }, 10);
    }
    
    return true;
  } catch (e) {
    // Direct text insertion failed
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
    // Error generating suggestion
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
      
      // We no longer generate an initial suggestion automatically
      // The following code is commented out to prevent automatic suggestion generation
      /*
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
      */
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
          return false;
        }
        
        // Store original editor content for comparison
        const originalContent = editor ? JSON.parse(JSON.stringify(editor.children)) : null;
        
        // Force executing our handler
        setTimeout(() => {
          let insertSuccessful = false;
          
          // Try to use editor methods first (more reliable for Slate model update)
          if (editor) {
            try {
              if (typeof editor.insertText === 'function') {
                editor.insertText(textToInsert);
                insertSuccessful = true;
              } else if (editor.api?.insertText) {
                editor.api.insertText(textToInsert);
                insertSuccessful = true;
              } else if (editor.insertFragment) {
                const fragment = [{ text: textToInsert }];
                editor.insertFragment(fragment);
                insertSuccessful = true;
              }
              
              // Compare content to see if it actually changed
              if (originalContent) {
                const contentChanged = compareEditorContent(originalContent, editor.children);
                
                // If content didn't change in the model, try harder to update it
                if (!contentChanged) {
                  // Try to directly modify the editor children by finding the current node
                  try {
                    if (editor.selection?.anchor?.path) {
                      const path = editor.selection.anchor.path;
                      const blockIndex = path[0];
                      if (editor.children[blockIndex]) {
                        const block = editor.children[blockIndex];
                        if (block.children && block.children.length > 0) {
                          // Get existing text and append the suggestion
                          const textNode = block.children[0];
                          const currentText = textNode.text || '';
                          textNode.text = currentText + textToInsert;
                        }
                      }
                    }
                  } catch (manualUpdateError) {
                    // Error in manual update
                  }
                }
              }
            } catch (editorError) {
              // Editor insertion failed - fall back to DOM methods
            }
          }
          
          // Fallback to DOM methods if editor methods failed
          if (!insertSuccessful) {
            insertSuccessful = directInsertText(textToInsert);
          }
          
          if (insertSuccessful) {
            // Clear the suggestion state
            isActive = false;
            currentText = '';
            blockSuggestions = {};
            
            // Update global variables
            (window as any).ghostTextIsActive = false;
            (window as any).ghostTextCurrentText = '';
            (window as any).ghostTextSuggestions = {};
            
            // Immediately remove any ghost text elements from the DOM
            try {
              // Remove any direct ghost text elements
              document.querySelectorAll('.direct-ghost-text').forEach(el => el.remove());
              
              // Remove any React-rendered ghost text elements
              document.querySelectorAll('.ghost-text-content').forEach(el => el.remove());
            } catch (e) {
              // Error removing ghost text elements
            }
            
            // Force refresh UI to clear ghost text
            const editor = getEditorInstance();
            if (editor) {
              try {
                // First approach: Force slate to update UI
                if (editor.selection) {
                  const oldSelection = { ...editor.selection };
                  editor.selection = null;
                  setTimeout(() => {
                    editor.selection = oldSelection;
                    
                    // Second approach: Force component rerender
                    if (editor._node?.parent?.forceUpdate) {
                      editor._node.parent.forceUpdate();
                    }
                  }, 0);
                }
                
                // Third approach: Dispatch custom event for UI refresh
                const refreshEvent = new CustomEvent('plate-ghost-text-clear', {
                  bubbles: true,
                  detail: { blockIds: Object.keys(blockSuggestions) }
                });
                document.dispatchEvent(refreshEvent);
              } catch (e) {
                // Error refreshing UI
              }
            }
            
            // Trigger all possible change events to ensure saving
            triggerEditorChangeEvent();
            
            // Explicitly trigger a save
            if (typeof (window as any).__PLATE_EDITOR_HANDLE_CHANGE__ === 'function') {
              (window as any).__PLATE_EDITOR_HANDLE_CHANGE__();
            }
            
            // FORCE a direct save with current editor content
            forceEditorContentSave();
            
            // Request a normal save too
            const saveContentEvent = new CustomEvent('plate-editor-save-content', {
              bubbles: true,
              detail: { manual: false }
            });
            document.dispatchEvent(saveContentEvent);
          }
        }, 0);
        
        return false;
      }
    }, { capture: true });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Control + Space to trigger suggestion (replacing Ctrl+G)
      if (e.ctrlKey && e.key === ' ') {
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
      
      // Keep existing Ctrl+G functionality for backward compatibility
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
    
    // Watch for typing but don't automatically generate suggestions
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
      
      // We no longer schedule new suggestions after typing pause
      // The following code is commented out to prevent automatic suggestion generation
      /*
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
      */
    });
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
            let insertSuccessful = false;
            
            // Method 1: Use insertText directly - PREFERRED for updating Slate model
            if (typeof editor.insertText === 'function') {
              editor.insertText(textToInsert);
              insertSuccessful = true;
            } 
            // Method 2: Use the editor API if available
            else if (editor.api?.insertText) {
              editor.api.insertText(textToInsert);
              insertSuccessful = true;
            }
            // Method 3: Use the Slate API
            else if (editor.insertFragment) {
              const fragment = [{ text: textToInsert }];
              editor.insertFragment(fragment);
              insertSuccessful = true;
            }
            // Method 4: Manual DOM insertion as fallback
            else if (window.getSelection) {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(textToInsert));
                
                // Extra step: Try to normalize editor after DOM change
                if (editor.normalize) {
                  setTimeout(() => {
                    editor.normalize();
                  }, 0);
                }
                
                insertSuccessful = true;
              }
            }
            
            if (!insertSuccessful) {
              return false;
            }
            
            // Force editor to update
            setTimeout(() => {
              // Thoroughly clear all ghost text
              clearAllGhostText();
              
              // Trigger all possible change events
              triggerEditorChangeEvent();
              
              // Explicitly call the debounced save if we can find it
              if (typeof (window as any).__PLATE_EDITOR_HANDLE_CHANGE__ === 'function') {
                (window as any).__PLATE_EDITOR_HANDLE_CHANGE__();
              }
              
              // Get PlateEditor to mark content as dirty
              const saveContentEvent = new CustomEvent('plate-editor-save-content', {
                bubbles: true,
                detail: { manual: false }
              });
              document.dispatchEvent(saveContentEvent);
            }, 0);
            
            return true;
          } catch (error) {
            // Error accepting suggestion
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

// Add an explicit function to clear all ghost text and expose it globally
function clearAllGhostText() {
  // Reset state variables
  isActive = false;
  currentText = '';
  blockSuggestions = {};
  
  // Update global variables
  if (typeof window !== 'undefined') {
    (window as any).ghostTextIsActive = false;
    (window as any).ghostTextCurrentText = '';
    (window as any).ghostTextSuggestions = {};
  }
  
  // Remove any ghost text elements from the DOM
  try {
    // Remove direct ghost text elements
    document.querySelectorAll('.direct-ghost-text').forEach(el => el.remove());
    
    // Remove React-rendered ghost text elements
    document.querySelectorAll('.ghost-text-content').forEach(el => el.remove());
  } catch (e) {
    // Error removing ghost text elements
  }
  
  // Force editor refresh
  const editor = getEditorInstance();
  if (editor && editor.selection) {
    try {
      const oldSelection = { ...editor.selection };
      editor.selection = null;
      setTimeout(() => {
        editor.selection = oldSelection;
      }, 0);
    } catch (e) {
      // Ignore errors during refresh
    }
  }
  
  return true;
}

// Expose clear function globally
if (typeof window !== 'undefined') {
  (window as any).clearAllGhostText = clearAllGhostText;
  
  // Override resetGhostText to ensure thorough clearing
  (window as any).resetGhostText = clearAllGhostText;
}

// Helper function to force save editor content directly
function forceEditorContentSave() {
  const editor = getEditorInstance();
  if (editor) {
    // Create and dispatch a custom save event
    const saveEvent = new CustomEvent('plate-editor-force-save', {
      bubbles: true,
      detail: { content: editor.children }
    });
    document.dispatchEvent(saveEvent);
    
    return true;
  }
  return false;
}

// Helper function to compare editor content before/after
function compareEditorContent(before: any, after: any) {
  const beforeStr = JSON.stringify(before);
  const afterStr = JSON.stringify(after);
  
  return beforeStr !== afterStr;
}

export default copilotPlugins;