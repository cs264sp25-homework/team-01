import { Button } from "@/ui/button";
import { Input } from "@/plate-ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/plate-ui/dialog";

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  newTestName: string;
  onNewTestNameChange: (name: string) => void;
  onRename: () => void;
}

export function RenameDialog({
  isOpen,
  onClose,
  newTestName,
  onNewTestNameChange,
  onRename,
}: RenameDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Test</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={newTestName}
            onChange={(e) => onNewTestNameChange(e.target.value)}
            placeholder="Enter new test name"
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onRename} disabled={!newTestName.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saveTestName: string;
  onSaveTestNameChange: (name: string) => void;
  onSave: () => void;
}

export function SaveDialog({
  isOpen,
  onClose,
  saveTestName,
  onSaveTestNameChange,
  onSave,
}: SaveDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Test</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={saveTestName}
            onChange={(e) => onSaveTestNameChange(e.target.value)}
            placeholder="Enter test name"
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!saveTestName.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 