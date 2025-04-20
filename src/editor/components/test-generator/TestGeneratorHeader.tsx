import { Button } from "@/ui/button";
import { List, XIcon } from "lucide-react";

interface TestGeneratorHeaderProps {
  view: "generate" | "list";
  onToggleView: () => void;
  onClose: () => void;
}

export function TestGeneratorHeader({ view, onToggleView, onClose }: TestGeneratorHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-shrink-0 p-4 border-b bg-muted/30">
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold">Test Generator</h3>
        <div className="flex items-center mt-1 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 mr-2 bg-blue-500 rounded-full"></span>
          {view === "generate" ? "Create practice questions" : "Manage saved tests"}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggleView}
          className="text-xs"
        >
          {view === "generate" ? (
            <><List className="w-3 h-3 mr-1" /> Saved Tests</>
          ) : (
            <> </>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
} 