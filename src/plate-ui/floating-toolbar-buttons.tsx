'use client';

// import React from 'react';

import {
  BoldPlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from '@udecode/plate-basic-marks/react';
import { useEditorReadOnly } from '@udecode/plate/react';
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
  WandSparklesIcon,
  BookOpenIcon,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

import { AIToolbarButton } from './ai-toolbar-button';
import { InlineEquationToolbarButton } from './inline-equation-toolbar-button';
import { LinkToolbarButton } from './link-toolbar-button';
import { MarkToolbarButton } from './mark-toolbar-button';
import { MoreDropdownMenu } from './more-dropdown-menu';
import { SuggestionToolbarButton } from './suggestion-toolbar-button';
import { ToolbarButton, ToolbarGroup } from './toolbar';
import { TurnIntoDropdownMenu } from './turn-into-dropdown-menu';
import TestGeneratorSidebar from '@/editor/components/TestGeneratorSidebar';
import { Id } from '../../convex/_generated/dataModel';
import { searchHighlight } from '@/editor/plugins/searchHighlightPlugin';

export function FloatingToolbarButtons() {
  const readOnly = useEditorReadOnly();
  const [testGeneratorOpen, setTestGeneratorOpen] = useState(false);
  const { noteId } = useParams();

  const navigateToText = (text: string) => {
    // Get the editor element
    const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
    
    if (!editorEl || !text) {
      console.error("Editor element not found or empty text");
      return;
    }
    
    // Clear any existing highlights first
    searchHighlight.clear(editorEl);
    
    // Try exact match first
    const { matchCount, matches } = searchHighlight.highlight(editorEl, text, false);
    
    // If matches were found, highlight the first one
    if (matchCount > 0 && matches.length > 0) {
      searchHighlight.highlightCurrent(matches[0]);
      return;
    }
    
    // If no exact match, try to find the longest matching substring
    const findLongestMatch = () => {
      // Clean up the source text (remove extra spaces)
      const cleanSource = text.replace(/\s+/g, ' ').trim();
      
      // Start with a reasonable chunk size (at least 10 words)
      const words = cleanSource.split(' ');
      
      // Try progressively smaller chunks until we find a match
      for (let chunkSize = Math.min(20, words.length); chunkSize >= 3; chunkSize--) {
        // Try different starting positions
        for (let startPos = 0; startPos <= words.length - chunkSize; startPos++) {
          const chunk = words.slice(startPos, startPos + chunkSize).join(' ');
          if (chunk.length < 15) continue; // Skip very short chunks
          
          const { matchCount, matches } = searchHighlight.highlight(editorEl, chunk, false);
          
          if (matchCount > 0 && matches.length > 0) {
            searchHighlight.highlightCurrent(matches[0]);
            console.log(`Found partial match: "${chunk}"`);
            return true;
          }
          
          // Clear any failed highlights before trying the next chunk
          searchHighlight.clear(editorEl);
        }
      }
      
      return false;
    };
    
    // Try to find the longest match
    const foundMatch = findLongestMatch();
    
    if (!foundMatch) {
      // Last resort: try individual key phrases
      const keyPhrases = text
        .split(/[.,;:!?]/)
        .map(phrase => phrase.trim())
        .filter(phrase => phrase.length > 15);
        
      for (const phrase of keyPhrases) {
        const { matchCount, matches } = searchHighlight.highlight(editorEl, phrase, false);
        if (matchCount > 0 && matches.length > 0) {
          searchHighlight.highlightCurrent(matches[0]);
          console.log(`Found key phrase match: "${phrase}"`);
          return;
        }
        searchHighlight.clear(editorEl);
      }
      
      console.log("No matches found for source text:", text);
    }
  };

  return (
    <>
      {!readOnly && (
        <>
          <ToolbarGroup>
            <AIToolbarButton tooltip="AI commands">
              <WandSparklesIcon />
              Ask AI
            </AIToolbarButton>
            
            <ToolbarButton 
              tooltip="Generate Test Questions"
              onClick={() => setTestGeneratorOpen(true)}
            >
              <BookOpenIcon />
              Test Generator
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <TurnIntoDropdownMenu />

            <MarkToolbarButton nodeType={BoldPlugin.key} tooltip="Bold (⌘+B)">
              <BoldIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={ItalicPlugin.key}
              tooltip="Italic (⌘+I)"
            >
              <ItalicIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={UnderlinePlugin.key}
              tooltip="Underline (⌘+U)"
            >
              <UnderlineIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={StrikethroughPlugin.key}
              tooltip="Strikethrough (⌘+⇧+M)"
            >
              <StrikethroughIcon />
            </MarkToolbarButton>


            <InlineEquationToolbarButton />

            <LinkToolbarButton />
          </ToolbarGroup>
        </>
      )}

      <ToolbarGroup>
        <SuggestionToolbarButton />

        {!readOnly && <MoreDropdownMenu />}
      </ToolbarGroup>

      {testGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-[500px] max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-medium">Generate Test Questions</h2>
              <Button variant="ghost" size="sm" onClick={() => setTestGeneratorOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <TestGeneratorSidebar 
                onClose={() => setTestGeneratorOpen(false)} 
                noteId={noteId as Id<"notes">}
                navigateToText={navigateToText}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
