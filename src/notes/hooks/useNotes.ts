import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "react-hot-toast";

export function useNotes(noteId?: string) {
  const [isContentSaving, setIsContentSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");

  // Queries
  const note = useQuery(
    api.notes.get,
    noteId ? { id: noteId as Id<"notes"> } : "skip"
  );

  // Mutations
  const updateNote = useMutation(api.notes.update);
  const renameNote = useMutation(api.notes.rename);
  const deleteNote = useMutation(api.notes.remove);
  const forceEmbed = useMutation(api.notes.forceEmbed);

  // Handle force embed
  const handleForceEmbed = async () => {
    if (!note || !noteId) return false;
    
    try {
      await forceEmbed({
        id: noteId as Id<"notes">,
      });
      toast.success("Embeddings updated successfully!");
      return true;
    } catch (error) {
      console.error("Failed to update embeddings:", error);
      toast.error("Failed to update embeddings");
      return false;
    }
  };

  // Update note content
  const handleUpdateNote = async (content: string, isManualSave = false) => {
    if (!note || !noteId) return;
    
    try {
      setIsContentSaving(true);
      await updateNote({
        id: noteId as Id<"notes">,
        title: note.title,
        content,
      });
      
      if (isManualSave) {
        toast.success("Note content saved successfully!");
      }
      
      return true;
    } catch (error) {
      console.error("Failed to save note content:", error);
      toast.error("Failed to save note content");
      return false;
    } finally {
      setIsContentSaving(false);
    }
  };

  // Rename note
  const handleRename = async (newTitle: string) => {
    if (!note || !noteId || !newTitle.trim()) return false;
    
    try {
      await renameNote({
        id: noteId as Id<"notes">,
        title: newTitle.trim(),
      });
      setTitle(newTitle.trim());
      setIsEditing(false);
      return true;
    } catch (error) {
      console.error("Failed to rename note:", error);
      toast.error("Failed to rename note");
      return false;
    }
  };

  // Delete note
  const handleDelete = async () => {
    if (!noteId) return false;
    
    try {
      await deleteNote({ id: noteId as Id<"notes"> });
      return true;
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
      return false;
    }
  };

  return {
    note,
    title,
    setTitle,
    isEditing,
    setIsEditing,
    isContentSaving,
    handleUpdateNote,
    handleRename,
    handleDelete,
    handleForceEmbed,
  };
}
