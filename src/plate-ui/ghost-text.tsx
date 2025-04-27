'use client';

import { useEffect, useRef } from 'react';
import { useElement, useEditorRef } from '@udecode/plate/react';

// Add a global function to test ghost text rendering directly
if (typeof window !== 'undefined') {
  (window as any).testGhostText = function() {
    console.log('[GhostText] Manual test rendering');
    
    // Find all paragraphs in the editor
    const paragraphs = document.querySelectorAll('[data-slate-node="element"]');
    console.log('[GhostText] Found elements:', paragraphs.length);
    
    // Add a test span to each paragraph
    paragraphs.forEach((p, i) => {
      // Check if we already added a test element
      if (p.querySelector('.ghost-text-test')) return;
      
      const span = document.createElement('span');
      span.className = 'ghost-text-test';
      span.textContent = ` TEST GHOST TEXT FOR ELEMENT ${i}`;
      span.style.backgroundColor = '#E6F7FF';
      span.style.color = '#0070F3';
      span.style.fontWeight = 'bold';
      span.style.padding = '0 4px';
      span.style.marginLeft = '4px';
      span.style.borderRadius = '4px';
      span.style.boxShadow = '0 0 4px rgba(0,112,243,0.5)';
      
      // Append to paragraph
      p.appendChild(span);
      console.log('[GhostText] Added test ghost text to element', i);
    });
  };
  
  (window as any).removeTestGhostText = function() {
    const testElements = document.querySelectorAll('.ghost-text-test');
    testElements.forEach(el => el.remove());
    console.log('[GhostText] Removed', testElements.length, 'test elements');
  };
}

// Force rendering ghost text for testing
// const FORCE_VISIBLE = true;

export const GhostText = () => {
  const element = useElement();
  
  // Access plugin options directly from window
  const isSuggested = () => {
    if (typeof window !== 'undefined') {
      // Use the global variables from copilot-plugin.tsx
      const isActive = (window as any).ghostTextIsActive;
      const suggestions = (window as any).ghostTextSuggestions || {};
      return isActive && suggestions[element?.id as string];
    }
    return false;
  };

  if (!isSuggested()) return null;

  return <GhostTextContent />;
};

export function GhostTextContent() {
  const editor = useEditorRef();
  const ghostTextRef = useRef<HTMLSpanElement>(null);
  
  // Get suggestion text from global state
  const getSuggestionText = () => {
    if (typeof window !== 'undefined') {
      // Use global variable from copilot-plugin.tsx
      return (window as any).ghostTextCurrentText || '';
    }
    return '';
  };
  
  const suggestionText = getSuggestionText();
  
  // Position the ghost text at the cursor position when it's mounted and when the text changes
  useEffect(() => {
    if (!ghostTextRef.current || !suggestionText || !editor?.selection) return;

    try {
      // Try to find the DOM node for the current selection
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        
        // Position ghost text absolutely at cursor position
        const rect = range.getBoundingClientRect();
        
        // Get editor container to calculate relative position
        const editorEl = document.querySelector('[data-slate-editor="true"]');
        const editorRect = editorEl?.getBoundingClientRect();
        
        if (rect && editorRect && ghostTextRef.current) {
          // Calculate position relative to editor
          const top = rect.top - editorRect.top; 
          const left = rect.left - editorRect.left;
          
          // Set ghost text position
          ghostTextRef.current.style.position = 'absolute';
          ghostTextRef.current.style.top = `${top}px`;
          ghostTextRef.current.style.left = `${left}px`;
          ghostTextRef.current.style.zIndex = '999';
        }
      }
    } catch (e) {
      console.error('[GhostText] Error positioning ghost text:', e);
    }
  }, [editor, suggestionText]);
  
  if (!suggestionText) return null;

  return (
    <span
      ref={ghostTextRef}
      className="ghost-text-content pointer-events-none max-sm:hidden"
      contentEditable={false}
      style={{
        opacity: 0.7,
        backgroundColor: '#f8f9fa', 
        color: '#6e7781',
        fontStyle: 'italic',
        padding: '0 2px',
        margin: '0 1px',
        borderRadius: '2px',
      }}
      data-ghost-text="true"
    >
      {suggestionText}
    </span>
  );
}
