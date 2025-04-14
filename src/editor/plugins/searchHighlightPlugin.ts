// searchHighlightPlugin.ts
import { createPlatePlugin } from '@udecode/plate/react';

export const createSearchHighlightPlugin = () =>
  createPlatePlugin({
    key: 'searchHighlight',
    // Optionally, add onKeyDown, normalization, or command extensions here.
    // In this refactored version, we keep our helper functions below.
  });

// Helper functions that operate on the editor's DOM

export const searchHighlight = {
  clear: (editorEl: HTMLElement | null) => {
    if (!editorEl) return;
    const highlights = editorEl.querySelectorAll('.search-highlight');
    highlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        // Replace the highlight span with its text content and normalize the node.
        parent.replaceChild(
          document.createTextNode(el.textContent || ''),
          el
        );
        parent.normalize();
      }
    });
  },
  highlight: (
    editorEl: HTMLElement | null,
    searchTerm: string,
    caseSensitive: boolean
  ): { matchCount: number; matches: HTMLElement[] } => {
    let matchCount = 0;
    const matches: HTMLElement[] = [];
    if (!editorEl || !searchTerm || searchTerm.length < 2) {
      return { matchCount, matches };
    }

    // Normalize the search term - replace special characters with regex-safe versions
    const normalizedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Get current content and create a temporary container.
    const editorContent = editorEl.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorContent;

    // Recursive helper function to process nodes.
    const highlightTextInNode = (node: Node): number => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        const searchFor = caseSensitive ? normalizedSearchTerm : normalizedSearchTerm.toLowerCase();
        const textToSearch = caseSensitive ? text : text.toLowerCase();
        
        // Create a regex that's more flexible with whitespace and punctuation
        const searchRegex = new RegExp(searchFor.replace(/\s+/g, '\\s+').replace(/:/g, '\\s*:\\s*'), 'g');
        
        let count = 0;
        let lastIndex = 0;
        const fragments: Node[] = [];
        let match;
        
        // Reset the regex lastIndex
        searchRegex.lastIndex = 0;
        
        while ((match = searchRegex.exec(textToSearch)) !== null) {
          const index = match.index;
          const matchLength = match[0].length;
          
          if (index > lastIndex) {
            fragments.push(document.createTextNode(text.substring(lastIndex, index)));
          }
          
          // Create a span for the matching text
          const highlightSpan = document.createElement('span');
          highlightSpan.className = 'search-highlight';
          highlightSpan.style.backgroundColor = '#ffeb3b80'; // default style
          highlightSpan.textContent = text.substring(index, index + matchLength);
          fragments.push(highlightSpan);
          
          lastIndex = index + matchLength;
          count++;
        }
        
        if (lastIndex < text.length) {
          fragments.push(document.createTextNode(text.substring(lastIndex)));
        }
        
        // Replace the current text node if any matches were found
        if (count > 0 && node.parentNode) {
          fragments.forEach((fragment) => {
            node.parentNode!.insertBefore(fragment, node);
          });
          node.parentNode.removeChild(node);
        }
        
        return count;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if ((node as Element).classList.contains('search-highlight')) {
          return 0;
        }
        let count = 0;
        Array.from(node.childNodes).forEach((child) => {
          count += highlightTextInNode(child);
        });
        return count;
      }
      return 0;
    };

    matchCount = highlightTextInNode(tempDiv);

    if (matchCount > 0) {
      // Replace the original editor content with the updated one.
      editorEl.innerHTML = tempDiv.innerHTML;
      const newHighlights = editorEl.querySelectorAll('.search-highlight');
      newHighlights.forEach((el) => matches.push(el as HTMLElement));
    }
    return { matchCount, matches };
  },
  // Update the style of the currently active/highlighted match.
  highlightCurrent: (match: HTMLElement) => {
    // Reset style for all siblings first.
    const editorEl = match.closest('[data-slate-editor="true"]');
    if (editorEl) {
      editorEl.querySelectorAll('.search-highlight').forEach((el) => {
        (el as HTMLElement).style.backgroundColor = '#ffeb3b80';
        (el as HTMLElement).style.outline = 'none';
      });
    }
    // Highlight the active match.
    match.style.backgroundColor = '#ffc10780';
    match.style.outline = '2px solid #ff980090';
    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};
