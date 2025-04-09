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

export function FloatingToolbarButtons() {
  const readOnly = useEditorReadOnly();
  const [testGeneratorOpen, setTestGeneratorOpen] = useState(false);
  const { noteId } = useParams();

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
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
