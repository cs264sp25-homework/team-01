"use client";

import { useEffect, useCallback, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Plate } from "@udecode/plate/react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

import { useCreateEditor } from "@/components/editor/use-create-editor";
import { Editor, EditorContainer } from "@/components/plate-ui/editor";
import { Button } from "@/components/plate-ui/button";
import { SaveIcon, SearchIcon, ListFilterIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  SearchBar,
  createSearchHighlightPlugin,
} from "@/components/editor/search-bar";

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
  isSaving = false,
}: PlateEditorProps) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);

  // Convex action for organizing notes
  const organizeNotesAction = useAction(api.openai.organizeNotes);

  // Parse initialContent if it exists, or use default empty editor state
  //TODO: we might need to change this if the intial content is not in this format.. I think this was a previous hacky way of doing it..
  const initialValue = initialContent
    ? JSON.parse(initialContent || "[]")
    : [{ type: "p", children: [{ text: "" }] }];

  // Create editor with all the default plugins, don't override them
  const editor = useCreateEditor({
    value: initialValue,
    // Don't replace the plugins array, just add the search plugin
    override: {
      plugins: {
        search: createSearchHighlightPlugin(),
      },
    },
  });

  // Function to save content
  const saveContent = useCallback(
    (isManualSave = true) => {
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
    },
    [editor, onUpdate]
  );

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
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, saveContent]);

  // Toggle search bar with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle search bar with Ctrl+F / Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBar((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Function to organize notes
  const organizeNotes = useCallback(async () => {
    try {
      setIsOrganizing(true);

      // Show toast for starting organization
      toast.loading("Organizing your notes...", { id: "organize-notes" });

      // Get current content from editor
      const currentContent = JSON.stringify(editor.children);

      //stash the current content in case of failure to pass back in
      // const stashedCurrContent = editor.children;

      console.log("Current content:", currentContent);

      // Call Convex action to organize notes
      const { organizedContent } = await organizeNotesAction({
        content: currentContent,
      });

      console.log("Organized content untrimmed:", organizedContent);

      // Update editor with organized content
      try {
        const rawContent = organizedContent.trim();
        console.log("Raw organized content:", rawContent);

        // Process the content to ensure it's an array
        let processedContent;
        try {
          // First check if the content starts with [ and ends with ]
          if (!rawContent.startsWith("[") || !rawContent.endsWith("]")) {
            console.warn(
              "Response is not a JSON array, will attempt to wrap it"
            );
          }

          const parsed = JSON.parse(rawContent);

          // If it's not an array, wrap it in an array
          if (!Array.isArray(parsed)) {
            console.warn(
              "Parsed content is not an array, wrapping it:",
              parsed
            );
            processedContent = [parsed];
          } else {
            processedContent = parsed;
          }

          // Validate the array has content
          if (processedContent.length === 0) {
            throw new Error("Empty array returned from AI");
          }

          // Log the first and last items for debugging
          console.log("First item:", JSON.stringify(processedContent[0]));
          console.log(
            "Last item:",
            JSON.stringify(processedContent[processedContent.length - 1])
          );
        } catch (e) {
          console.error("JSON parsing error:", e, rawContent);
          throw new Error(
            "Invalid response from AI. Could not parse as JSON array."
          );
        }

        console.log("Processed content length:", processedContent.length);

        // Update the editor's children
        editor.children = processedContent;

        //if their is some failute can set editor.children to stashedCurrContent
        //TODO: figure out proper error handling. this is just my thought for now..

        // Properly trigger change handling in the Plate editor
        // @ts-ignore - Using private API
        editor.normalize();

        // Use a small delay before triggering change handlers
        setTimeout(() => {
          handleEditorChange();
          setIsDirty(true);
        }, 0);

        toast.success("Notes organized successfully!", {
          id: "organize-notes",
        });
      } catch (parseError) {
        console.error("Error parsing organized content:", parseError);
        toast.error(
          "Failed to apply organized notes - invalid format returned",
          { id: "organize-notes" }
        );
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
                onClick={() => saveContent(true)} // Manual save
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
                {isAutoSaving
                  ? "Auto-saving..."
                  : `Last saved: ${lastSavedAt.toLocaleTimeString()}`}
              </span>
            )}
          </div>
        )}
        <Plate editor={editor} onChange={handleEditorChange}>
          <div className="relative">
            {/* Search bar - make sure it's visible and properly styled */}
            {showSearchBar && (
              <div className="sticky top-0 z-10 p-2 mb-2 border-b border-gray-200 bg-background">
                <SearchBar />
              </div>
            )}

            {/* Editor */}
            <EditorContainer>
              <Editor placeholder="Type here..." autoFocus />
            </EditorContainer>

            {/* Search toggle button - make it more visible */}
            <div className="absolute top-2 right-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearchBar((prev) => !prev)}
                title="Search (Ctrl+F)"
              >
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
