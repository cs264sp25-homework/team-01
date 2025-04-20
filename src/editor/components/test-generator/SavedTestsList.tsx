import { Button } from "@/ui/button";
import { BookOpen, Edit, Trash2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface SavedTest {
  _id: Id<"tests">;
  title: string;
  createdAt: number;
  questions: any[];
  settings: {
    difficulty: string;
  };
}

interface SavedTestsListProps {
  savedTests: SavedTest[] | null;
  onOpenTest: (testId: Id<"tests">) => void;
  onRenameTest: (testId: Id<"tests">, currentTitle?: string) => void;
  onDeleteTest: (testId: Id<"tests">) => void;
  onSwitchToGenerate: () => void;
}

export function SavedTestsList({
  savedTests,
  onOpenTest,
  onRenameTest,
  onDeleteTest,
  onSwitchToGenerate,
}: SavedTestsListProps) {
  if (!savedTests || savedTests.length === 0) {
    return (
      <div className="text-center p-6 border rounded-md bg-muted/10">
        <p className="text-muted-foreground">No saved tests yet</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={onSwitchToGenerate}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Create Your First Test
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {savedTests.map((test) => (
        <div 
          key={test._id} 
          className="p-3 border rounded-md flex justify-between items-center hover:bg-muted/20"
        >
          <div className="flex-1">
            <h4 className="font-medium">{test.title}</h4>
            <p className="text-xs text-muted-foreground">
              {new Date(test.createdAt).toLocaleString()} • 
              {test.questions.length} questions • 
              {test.settings.difficulty} difficulty
            </p>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenTest(test._id)}
              title="Open Test"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onRenameTest(test._id, test.title)}
              title="Rename Test"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onDeleteTest(test._id)}
              title="Delete Test"
              className="text-red-500 hover:text-red-700 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
} 