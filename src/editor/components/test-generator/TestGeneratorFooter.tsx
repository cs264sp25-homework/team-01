import { Button } from "@/ui/button";
import { CheckCircle, RefreshCw, Save, ArrowLeft, Loader2 } from "lucide-react";
import { calculateScore } from "./test-generator-utils";
import { GeneratedTest } from "./test-generator-types";

interface TestGeneratorFooterProps {
  view: "generate" | "list";
  generatedTest: GeneratedTest | null;
  isGenerating: boolean;
  isSubmitted: boolean;
  isGrading: boolean;
  gradingProgress: { total: number; completed: number };
  userAnswers: Record<string, string>;
  selectedTestId: string | null;
  onGenerate: () => void;
  onSubmit: () => void;
  onSave: () => void;
  onRetake: () => void;
  onNewTest: () => void;
  onSwitchToGenerate: () => void;
  hasValidSections: boolean;
}

export function TestGeneratorFooter({
  view,
  generatedTest,
  isGenerating,
  isSubmitted,
  isGrading,
  gradingProgress,
  userAnswers,
  selectedTestId,
  onGenerate,
  onSubmit,
  onSave,
  onRetake,
  onNewTest,
  onSwitchToGenerate,
  hasValidSections,
}: TestGeneratorFooterProps) {
  // Sticky footer container for always-visible buttons
  return (
    <div className="sticky bottom-0 left-0 w-full bg-white/95 backdrop-blur z-20 p-4 border-t shadow-xl max-w-full min-h-24 flex items-center">
      {view === "list" ? (
        <Button onClick={onSwitchToGenerate} className="w-full">
          Create New Test
        </Button>
      ) : !generatedTest ? (
        <Button 
          onClick={onGenerate} 
          className="w-full"
          disabled={isGenerating || !hasValidSections}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>Generate Test</>
          )}
        </Button>
      ) : isSubmitted ? (
        <div className="text-center w-full">
          {isGrading ? (
            <div className="space-y-4">
              <div className="text-sm font-medium">
                Grading short answer questions...
              </div>
              <div className="text-xs text-muted-foreground">
                {gradingProgress.completed} of {gradingProgress.total} questions graded
              </div>
              <div className="flex justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm mb-2 font-medium">
                Score: {calculateScore(generatedTest, userAnswers, {}, true).correct} of {calculateScore(generatedTest, userAnswers, {}, true).total} correct
                {calculateScore(generatedTest, userAnswers, {}, true).total > 0 && 
                  ` (${Math.round((calculateScore(generatedTest, userAnswers, {}, true).correct / calculateScore(generatedTest, userAnswers, {}, true).total) * 100)}%)`}
              </p>
              <div className="flex space-x-2">
                {!selectedTestId && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={onSave}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Test
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={onRetake}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake Test
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={onNewTest}
                >
                  New Test
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2 w-full">
          <Button 
            className="w-full"
            onClick={onSubmit}
            disabled={Object.keys(userAnswers).length === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Submit Answers
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onNewTest}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Options
          </Button>
        </div>
      )}
    </div>
  );
} 