// search-bar.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/plate-ui/input';
import { Button } from '@/ui/button';
import { SearchIcon, ArrowUpIcon, ArrowDownIcon, XIcon } from 'lucide-react';
import { createSearchHighlightPlugin, searchHighlight } from '@/editor/plugins/searchHighlightPlugin';

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

  // Find the editor element on mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
      editorRef.current = editorEl;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Clear highlights by calling the plugin helper.
  const clearHighlights = useCallback(() => {
    if (editorRef.current) {
      searchHighlight.clear(editorRef.current);
    }
    matchesRef.current = [];
    setMatchCount(0);
    setCurrentMatchIndex(0);
  }, []);

  // Handle search by leveraging the helper from our plugin.
  const handleSearch = useCallback(() => {
    if (!editorRef.current || !searchTerm || searchTerm.length < 2) return;
    setIsSearching(true);
    try {
      clearHighlights();
      const { matchCount, matches } = searchHighlight.highlight(editorRef.current, searchTerm, caseSensitive);
      matchesRef.current = matches;
      setMatchCount(matchCount);
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
        searchHighlight.highlightCurrent(matches[0]);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, caseSensitive, clearHighlights]);

  // Re-run search whenever search term changes.
  useEffect(() => {
    if (searchTerm.length > 1) {
      const timer = setTimeout(handleSearch, 300);
      return () => clearTimeout(timer);
    } else {
      clearHighlights();
    }
  }, [searchTerm, clearHighlights, handleSearch]);

  // Navigate to the next or previous match.
  const navigateMatch = useCallback(
    (direction: 'next' | 'previous') => {
      if (matchesRef.current.length === 0) return;
      const newIndex =
        direction === 'next'
          ? (currentMatchIndex + 1) % matchesRef.current.length
          : (currentMatchIndex - 1 + matchesRef.current.length) % matchesRef.current.length;
      setCurrentMatchIndex(newIndex);
      searchHighlight.highlightCurrent(matchesRef.current[newIndex]);
    },
    [currentMatchIndex]
  );

  const handleNext = useCallback(() => {
    navigateMatch('next');
  }, [navigateMatch]);

  const handlePrevious = useCallback(() => {
    navigateMatch('previous');
  }, [navigateMatch]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    clearHighlights();
  }, [clearHighlights]);

  // Keyboard navigation shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchesRef.current.length === 0) return;
      if (e.key === 'F3' || (e.key === 'Enter' && document.activeElement !== inputRef.current)) {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
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
            if (e.key === 'Enter') handleSearch();
          }}
        />
        {searchTerm && (
          <div className="absolute right-2 top-2 text-sm text-muted-foreground">
            {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : 'No results'}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className={`px-2 ${caseSensitive ? 'bg-muted' : ''}`}
        onClick={() => setCaseSensitive(!caseSensitive)}
        title={caseSensitive ? 'Case sensitive' : 'Case insensitive'}
      >
        {caseSensitive ? 'Aa' : 'aa'}
      </Button>
      <Button variant="outline" size="icon" onClick={handlePrevious} disabled={!searchTerm || matchCount === 0}>
        <ArrowUpIcon className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={handleNext} disabled={!searchTerm || matchCount === 0}>
        <ArrowDownIcon className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={handleClear}>
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
