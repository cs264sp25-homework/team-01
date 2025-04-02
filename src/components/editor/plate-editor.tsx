"use client";

import { useEffect, useCallback, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Plate } from "@udecode/plate/react";

import { useCreateEditor } from "@/components/editor/use-create-editor";
import { Editor, EditorContainer } from "@/components/plate-ui/editor";
import { Button } from "@/components/plate-ui/button";
import { SaveIcon } from "lucide-react";

// Debounce function to limit how often a function can be called
function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
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
  isSaving = false
}: PlateEditorProps) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // Parse initialContent if it exists, or use default empty editor state
  const initialValue = initialContent 
    ? JSON.parse(initialContent || "[]")
    : [{ type: "p", children: [{ text: "" }] }];

  const editor = useCreateEditor({
    value: initialValue,
  });

  // Function to save content
  const saveContent = useCallback((isManualSave = true) => {
    if (onUpdate) {
      // Only set autoSaving state for auto-save operations
      if (!isManualSave) {
        setIsAutoSaving(true);
      }
      
      // Get the current value from the editor and stringify it
      const content = JSON.stringify(editor.children);
      
      // Use Promise.resolve to make this async to avoid blocking the UI thread
      Promise.resolve().then(() => {
        onUpdate(content, isManualSave);
        setLastSavedAt(new Date());
        setIsDirty(false);
        if (!isManualSave) {
          setIsAutoSaving(false);
        }
      });
    }
  }, [editor, onUpdate]);
  
  // Debounced version of saveContent
  const debouncedSave = useCallback(
    debounce(() => {
      saveContent(false); // Auto-save, not manual
    }, 2000),
    [saveContent]
  );

  // Handle editor changes
  const handleEditorChange = useCallback(() => {
    setIsDirty(true);
    if (autoSave) {
      debouncedSave();
    }
  }, [autoSave, debouncedSave]);

  // Save content when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        saveContent(false); // Not a manual save when leaving page
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, saveContent]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        {onUpdate && (
          <div className="sticky top-0 z-10 p-2 bg-white border-b flex justify-between items-center">
            <Button 
              onClick={() => saveContent(true)} // Manual save
              variant="outline" 
              className="flex items-center gap-2"
              disabled={!isDirty || isSaving}
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin">◌</span>
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            
            {lastSavedAt && (
              <span className="text-sm text-gray-500">
                {isAutoSaving ? "Auto-saving..." : `Last saved: ${lastSavedAt.toLocaleTimeString()}`}
              </span>
            )}
          </div>
        )}
        <Plate editor={editor} onChange={handleEditorChange}>
          <EditorContainer>
            <Editor variant="demo" />
          </EditorContainer>
        </Plate>
      </div>
    </DndProvider>
  );
}
