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

  const organizeNotesAction = useAction(api.openai.organizeNotes);

  const initialValue = initialContent
    ? JSON.parse(initialContent || "[]")
    : [{ type: "p", children: [{ text: "" }] }];

  // Create the editor and include the custom search plugin as part of the override.
  const editor = useCreateEditor({
    value: initialValue,
    override: {
      plugins: {
        search: createSearchHighlightPlugin(),
      },
    },
  });

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

  const organizeNotes = useCallback(async () => {
    try {
      setIsOrganizing(true);
      toast.loading("Organizing your notes...", { id: "organize-notes" });
      const currentContent = JSON.stringify(editor.children);
      console.log("Current content:", currentContent);
      const { organizedContent } = await organizeNotesAction({ content: currentContent });
      console.log("Organized content:", organizedContent);
      try {
        const rawContent = organizedContent.trim();
        let processedContent;
        try {
          const parsed = JSON.parse(rawContent);
          processedContent = Array.isArray(parsed) ? parsed : [parsed];
          if (processedContent.length === 0)
            throw new Error("Empty array returned from AI");
        } catch (e) {
          console.error("JSON parsing error:", e, rawContent);
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
        console.error("Error parsing organized content:", parseError);
        toast.error("Failed to apply organized notes - invalid format returned", { id: "organize-notes" });
      }
    } catch (error) {
      console.error("Error organizing notes:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to organize notes",
        { id: "organize-notes" }
      );
    } finally {
      setIsOrganizing(false);
    }
  }, [editor, handleEditorChange, organizeNotesAction]);

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
