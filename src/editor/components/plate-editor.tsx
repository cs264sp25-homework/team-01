// plate-editor.tsx
'use client';

import { useEffect, useCallback, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plate } from '@udecode/plate/react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCreateEditor } from '@/editor/hooks/use-create-editor';
import { Editor, EditorContainer } from '@/plate-ui/editor';
import { Button } from '@/ui/button';
import { SaveIcon, SearchIcon, ListFilterIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SearchBar, createSearchHighlightPlugin } from '@/editor/components/search-bar';
import React from 'react';

// A simple debounce helper
function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface PlateEditorProps {
  initialContent?: string;
  onUpdate?: (content: string, isManualSave?: boolean) => void;
  autoSave?: boolean;
  isSaving?: boolean;
}

export function PlateEditor({
  initialContent = "",
  onUpdate,
  autoSave = true,
  isSaving = false,
}: PlateEditorProps) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [currentContent, _] = useState(initialContent ? JSON.parse(initialContent) : [{ type: "p", children: [{ text: "" }] }]);
  

  const organizeNotesAction = useAction(api.openai.organizeNotes);

  

  // Create the editor and include the custom search plugin as part of the override.
  const editor = useCreateEditor({
    value: currentContent,
    override: {
      plugins: {
        search: createSearchHighlightPlugin(),
      },
    },
  });

  // Set global editor reference for plugin access
  React.useEffect(() => {
    if (editor) {
      (window as any).__PLATE_EDITOR__ = editor;
      
      // Use the store function from copilot-plugin if available
      if (typeof (window as any).__STORE_EDITOR_REF__ === 'function') {
        (window as any).__STORE_EDITOR_REF__(editor);
      }
    }
  }, [editor]);

  const saveContent = useCallback(
    (isManualSave = true) => {
      if (onUpdate) {
        if (!isManualSave) setIsAutoSaving(true);
        const content = JSON.stringify(editor.children);
        Promise.resolve().then(() => {
          onUpdate(content, isManualSave);
          setLastSavedAt(new Date());
          setIsDirty(false);
          if (!isManualSave) setIsAutoSaving(false);
        });
      }
    },
    [editor, onUpdate]
  );

  const debouncedSave = useCallback(debounce(() => saveContent(false), 2000), [saveContent]);

  const handleEditorChange = useCallback(() => {
    setIsDirty(true);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);
  
  // Expose handleEditorChange globally for plugins to access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__PLATE_EDITOR_HANDLE_CHANGE__ = handleEditorChange;
      
      // Also store the plate instance if possible
      if (typeof (window as any).__PLATE_INSTANCE__ === 'undefined') {
        setTimeout(() => {
          try {
            // Look for the Plate component in React fibers
            document.querySelectorAll('[data-slate-plugin-plate]');
          } catch (e) {
            // Error finding Plate instance
          }
        }, 500);
      }
    }
    
    return () => {
      // Clean up global reference when component unmounts
      if (typeof window !== 'undefined') {
        delete (window as any).__PLATE_EDITOR_HANDLE_CHANGE__;
      }
    };
  }, [handleEditorChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        saveContent(false);
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, saveContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBar(prev => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Listen for external changes from plugins (like copilot)
  useEffect(() => {
    const handleExternalChange = () => {
      // Mark as dirty and trigger autosave if enabled
      setIsDirty(true);
      if (autoSave) debouncedSave();
    };
    
    // Direct save content trigger from plugins
    const handleSaveContent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const isManual = customEvent.detail?.manual === true;
      saveContent(isManual);
    };
    
    // Force save with specific content
    const handleForceSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.content && onUpdate) {
        const content = JSON.stringify(customEvent.detail.content);
        onUpdate(content, false);
        setLastSavedAt(new Date());
        setIsDirty(false);
      }
    };
    
    // Listen for our custom events
    document.addEventListener('plate-editor-change', handleExternalChange);
    document.addEventListener('editor-content-changed', handleExternalChange);
    document.addEventListener('plate-editor-save-content', handleSaveContent);
    document.addEventListener('plate-editor-force-save', handleForceSave);
    
    return () => {
      document.removeEventListener('plate-editor-change', handleExternalChange);
      document.removeEventListener('editor-content-changed', handleExternalChange);
      document.removeEventListener('plate-editor-save-content', handleSaveContent);
      document.removeEventListener('plate-editor-force-save', handleForceSave);
    };
  }, [autoSave, debouncedSave, saveContent, onUpdate]);

  const organizeNotes = useCallback(async () => {
    try {
      setIsOrganizing(true);
      toast.loading("Organizing your notes...", { id: "organize-notes" });
      const currentContent = JSON.stringify(editor.children);
      const { organizedContent } = await organizeNotesAction({ content: currentContent });
      try {
        const rawContent = organizedContent.trim();
        let processedContent;
        try {
          const parsed = JSON.parse(rawContent);
          processedContent = Array.isArray(parsed) ? parsed : [parsed];
          if (processedContent.length === 0)
            throw new Error("Empty array returned from AI");
        } catch (e) {
          throw new Error("Invalid response from AI. Could not parse as JSON array.");
        }
        editor.children = processedContent;
        // Trigger normalization on the editor.
        // @ts-ignore
        editor.normalize();
        setTimeout(() => {
          handleEditorChange();
          setIsDirty(true);
        }, 0);
        toast.success("Notes organized successfully!", { id: "organize-notes" });
      } catch (parseError) {
        toast.error("Failed to apply organized notes - invalid format returned", { id: "organize-notes" });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to organize notes",
        { id: "organize-notes" }
      );
    } finally {
      setIsOrganizing(false);
    }
  }, [editor, handleEditorChange, organizeNotesAction]);

  // Save content to local storage when it changes
  // const handleContentChange = React.useCallback((newValue: any) => {
  //   // Only save if the content is different from the current content
  //   if (JSON.stringify(newValue) !== JSON.stringify(currentContent)) {
  //     setCurrentContent(newValue);
  //   }
  // }, [currentContent]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        {onUpdate && (
          <div className="sticky top-0 z-10 flex items-center justify-between p-2 bg-white border-b">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => saveContent(true)}
                variant="outline"
                className="flex items-center gap-2"
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 animate-spin">◌</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={organizeNotes}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isOrganizing}
              >
                {isOrganizing ? (
                  <>
                    <span className="w-4 h-4 animate-spin">◌</span>
                    Organizing...
                  </>
                ) : (
                  <>
                    <ListFilterIcon className="w-4 h-4" />
                    Organize Notes
                  </>
                )}
              </Button>
            </div>
            {lastSavedAt && (
              <span className="text-sm text-gray-500">
                {isAutoSaving ? "Auto-saving..." : `Last saved: ${lastSavedAt.toLocaleTimeString()}`}
              </span>
            )}
          </div>
        )}
        <Plate editor={editor} onChange={handleEditorChange}>
          <div className="relative">
            {showSearchBar && (
              <div className="sticky top-0 z-10 p-2 mb-2 border-b border-gray-200 bg-background">
                <SearchBar />
              </div>
            )}
            <EditorContainer>
              <Editor placeholder="Type here..." autoFocus />
            </EditorContainer>
            <div className="absolute top-2 right-2">
              <Button variant="outline" size="sm" onClick={() => setShowSearchBar(prev => !prev)} title="Search (Ctrl+F)">
                <SearchIcon className="w-4 h-4" />
                {!showSearchBar && <span className="ml-2">Search</span>}
              </Button>
            </div>
          </div>
        </Plate>
      </div>
    </DndProvider>
  );
}
