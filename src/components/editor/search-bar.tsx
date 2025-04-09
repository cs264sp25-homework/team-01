'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/plate-ui/input';
import { Button } from '@/components/plate-ui/button';
import { SearchIcon, ArrowUpIcon, ArrowDownIcon, XIcon } from 'lucide-react';
import { createPlatePlugin } from '@udecode/plate/react';

// Create a plugin to handle search highlighting
const createSearchHighlightPlugin = () => createPlatePlugin({
  key: 'searchHighlight',
});

export { createSearchHighlightPlugin };

export const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const editorRef = useRef<HTMLElement | null>(null);
  const matchesRef = useRef<HTMLElement[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Find the editor element when component mounts
  useEffect(() => {
    // Delay to ensure editor is mounted
    const timer = setTimeout(() => {
      const editorElement = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
      editorRef.current = editorElement;
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    // Remove any existing highlights
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        // Replace the highlight span with its text content
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        // Normalize to merge adjacent text nodes
        parent.normalize();
      }
    });
    
    matchesRef.current = [];
    setMatchCount(0);
    setCurrentMatchIndex(0);
  }, []);

  // Highlight text in the editor
  const handleSearch = useCallback(() => {
    if (!editorRef.current || !searchTerm || searchTerm.length < 2) return;
    
    setIsSearching(true);
    
    try {
      // Clear previous highlights
      clearHighlights();
      
      // Get the editor's HTML content
      const editorContent = editorRef.current.innerHTML;
      
      // Create a temporary div to work with the content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editorContent;
      
      // Function to highlight text in a node
      const highlightTextInNode = (node: Node): number => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          const text = node.textContent;
          const searchFor = caseSensitive ? searchTerm : searchTerm.toLowerCase();
          const textToSearch = caseSensitive ? text : text.toLowerCase();
          
          let count = 0;
          let lastIndex = 0;
          let index;
          
          // Find all occurrences
          const fragments = [];
          while ((index = textToSearch.indexOf(searchFor, lastIndex)) !== -1) {
            // Text before the match
            if (index > lastIndex) {
              fragments.push(document.createTextNode(text.substring(lastIndex, index)));
            }
            
            // The matched text with highlight
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'search-highlight';
            highlightSpan.style.backgroundColor = '#ffeb3b80';
            highlightSpan.textContent = text.substring(index, index + searchTerm.length);
            fragments.push(highlightSpan);
            
            lastIndex = index + searchTerm.length;
            count++;
          }
          
          // Text after the last match
          if (lastIndex < text.length) {
            fragments.push(document.createTextNode(text.substring(lastIndex)));
          }
          
          // Replace the text node with the fragments if we found matches
          if (count > 0 && node.parentNode) {
            fragments.forEach(fragment => {
              node.parentNode!.insertBefore(fragment, node);
            });
            node.parentNode.removeChild(node);
          }
          
          return count;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Skip existing highlight spans to avoid double-highlighting
          if ((node as Element).classList && 
              (node as Element).classList.contains('search-highlight')) {
            return 0;
          }
          
          // Process child nodes
          let count = 0;
          const childNodes = Array.from(node.childNodes);
          for (const child of childNodes) {
            count += highlightTextInNode(child);
          }
          return count;
        }
        
        return 0;
      };
      
      // Highlight all occurrences in the temp div
      const totalMatches = highlightTextInNode(tempDiv);
      
      // Replace the editor's content with the highlighted version
      if (totalMatches > 0) {
        // Replace the editor content
        editorRef.current.innerHTML = tempDiv.innerHTML;
        
        // Get the new highlight elements from the actual DOM
        const newHighlights = editorRef.current.querySelectorAll('.search-highlight');
        const highlightElements: HTMLElement[] = [];
        
        newHighlights.forEach(el => {
          highlightElements.push(el as HTMLElement);
        });
        
        // Update state with match information
        matchesRef.current = highlightElements;
        setMatchCount(totalMatches);
        
        // Highlight the first match
        if (highlightElements.length > 0) {
          setCurrentMatchIndex(0);
          highlightCurrentMatch(0);
        }
      } else {
        setMatchCount(0);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, caseSensitive, clearHighlights]);
  
  // Perform search when search term changes
  useEffect(() => {
    if (searchTerm.length > 1) {
      // Delay search to avoid rapid re-renders
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      clearHighlights();
    }
  }, [searchTerm, clearHighlights, handleSearch]);
  
  // Highlight the current match
  const highlightCurrentMatch = useCallback((index: number) => {
    try {
      // Remove current highlight styling
      matchesRef.current.forEach(el => {
        el.style.backgroundColor = '#ffeb3b80'; // Light yellow
        el.style.outline = 'none';
      });
      
      // Add current highlight styling
      const currentMatch = matchesRef.current[index];
      if (currentMatch) {
        currentMatch.style.backgroundColor = '#ffc10780'; // Stronger yellow
        currentMatch.style.outline = '2px solid #ff980090'; // Orange outline
        
        // Scroll to the match
        currentMatch.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    } catch (e) {
      console.error('Error highlighting current match:', e);
    }
  }, []);
  
  // Navigate to next match
  const handleNext = useCallback(() => {
    if (matchesRef.current.length === 0) return;
    
    const nextIndex = (currentMatchIndex + 1) % matchesRef.current.length;
    setCurrentMatchIndex(nextIndex);
    highlightCurrentMatch(nextIndex);
  }, [currentMatchIndex, highlightCurrentMatch]);
  
  // Navigate to previous match
  const handlePrevious = useCallback(() => {
    if (matchesRef.current.length === 0) return;
    
    const prevIndex = (currentMatchIndex - 1 + matchesRef.current.length) % matchesRef.current.length;
    setCurrentMatchIndex(prevIndex);
    highlightCurrentMatch(prevIndex);
  }, [currentMatchIndex, highlightCurrentMatch]);
  
  // Clear search
  const handleClear = useCallback(() => {
    setSearchTerm('');
    clearHighlights();
  }, [clearHighlights]);

  // Add keyboard navigation for search results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if search is active
      if (matchesRef.current.length === 0) return;
      
      // Navigate with F3 or Enter
      if (e.key === 'F3' || (e.key === 'Enter' && document.activeElement !== inputRef.current)) {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
      
      // Navigate with arrow keys when holding Ctrl/Cmd
      if ((e.ctrlKey || e.metaKey) && matchesRef.current.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          handlePrevious();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious]);

  return (
    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search in note..."
          className="pl-8 pr-20"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        {searchTerm && (
          <div className="absolute right-2 top-2 text-sm text-muted-foreground">
            {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : "No results"}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className={`px-2 ${caseSensitive ? 'bg-muted' : ''}`}
        onClick={() => setCaseSensitive(!caseSensitive)}
        title={caseSensitive ? "Case sensitive" : "Case insensitive"}
      >
        {caseSensitive ? "Aa" : "aa"}
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handlePrevious}
        disabled={!searchTerm || matchCount === 0}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleNext}
        disabled={!searchTerm || matchCount === 0}
      >
        <ArrowDownIcon className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleClear}
      >
        <XIcon className="h-4 w-4" />
      </Button>
      {isSearching && (
        <div className="absolute right-2 top-2 text-sm text-muted-foreground flex items-center">
          <span className="animate-spin mr-1">⟳</span> Searching...
        </div>
      )}
    </div>
  );
}; 