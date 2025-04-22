import { Button } from "@/ui/button";
import {
  SaveIcon,
  ListFilterIcon,
  NetworkIcon,
  FileDownIcon,
  RefreshCwIcon,
} from "lucide-react";

interface EditorToolbarProps {
  onSave: () => void;
  onOrganize: () => void;
  onGenerateConceptMap: () => void;
  onExport: () => void;
  onForceEmbed: () => void;
  isDirty: boolean;
  isSaving: boolean;
  isOrganizing: boolean;
  isExporting: boolean;
  isEmbedding: boolean;
  lastSavedAt: Date | null;
  lastEmbeddedAt?: number;
  isAutoSaving: boolean;
}

export function EditorToolbar({
  onSave,
  onOrganize,
  onGenerateConceptMap,
  onExport,
  onForceEmbed,
  isDirty,
  isSaving,
  isOrganizing,
  isExporting,
  isEmbedding,
  lastSavedAt,
  lastEmbeddedAt,
  isAutoSaving,
}: EditorToolbarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between p-2 bg-white border-b">
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
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
          onClick={onOrganize}
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
        <Button
          onClick={onGenerateConceptMap}
          variant="outline"
          className="flex items-center gap-2"
        >
          <NetworkIcon className="w-4 h-4" />
          Generate Concept Map
        </Button>
        <Button
          onClick={onExport}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="w-4 h-4 animate-spin">◌</span>
              Exporting...
            </>
          ) : (
            <>
              <FileDownIcon className="w-4 h-4" />
              Export PDF
            </>
          )}
        </Button>
        <Button
          onClick={onForceEmbed}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isEmbedding}
          title={
            lastEmbeddedAt
              ? `Last embedded: ${new Date(lastEmbeddedAt).toLocaleString()}`
              : undefined
          }
        >
          {isEmbedding ? (
            <>
              <span className="w-4 h-4 animate-spin">◌</span>
              Embedding...
            </>
          ) : (
            <>
              <RefreshCwIcon className="w-4 h-4" />
              {lastEmbeddedAt ? "Re-embed" : "Embed"}
            </>
          )}
        </Button>
        {lastEmbeddedAt && (
          <span className="ml-2 text-sm text-gray-500">
            Last embedded: {new Date(lastEmbeddedAt).toLocaleString()}
          </span>
        )}
      </div>
      {lastSavedAt && (
        <span className="text-sm text-gray-500">
          {isAutoSaving
            ? "Auto-saving..."
            : `Last saved: ${lastSavedAt.toLocaleTimeString()}`}
        </span>
      )}
    </div>
  );
}
