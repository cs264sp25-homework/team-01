import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Checkbox } from "@/ui/checkbox";
import { searchHighlight } from "../plugins/searchHighlightPlugin";
import { TestGeneratorHeader } from "./test-generator/TestGeneratorHeader";
import { TestGeneratorOptions } from "./test-generator/TestGeneratorOptions";
import { TestQuestionList } from "./test-generator/TestQuestionList";
import { SavedTestsList } from "./test-generator/SavedTestsList";
import { TestGeneratorFooter } from "./test-generator/TestGeneratorFooter";
import { RenameDialog, SaveDialog } from "./test-generator/TestGeneratorDialogs";
import { 
  GeneratedTest, 
  TestGeneratorSidebarProps,
  QuestionTypes,
  GradingProgress,
  ShortAnswerGrade
} from "./test-generator/test-generator-types";
import { getSelectedQuestionTypes } from "./test-generator/test-generator-utils";

interface SavedTest {
  _id: Id<"tests">;
  _creationTime: number;
  title: string;
  noteId: Id<"notes">;
  userId: string;
  createdAt: number;
  questions: Array<{
    type: string;
    question: string;
    options?: string[];
    answer: string;
    source?: string;
  }>;
  settings: {
    numQuestions: number;
    types: string[];
    difficulty: string;
    sections: string[];
  };
}

export default function TestGeneratorSidebar({ onClose, noteId, navigateToText }: TestGeneratorSidebarProps) {
  // State for test generation options
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuestionTypes>({
    mcq: true,
    shortAnswer: false,
    trueFalse: false,
    fillInBlank: false,
  });
  const [difficulty, setDifficulty] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | null>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [hasValidSections, setHasValidSections] = useState(true);
  
  // New state for test management
  const [view, setView] = useState<"generate" | "list">("generate");
  const [selectedTestId, setSelectedTestId] = useState<Id<"tests"> | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [currentTestTitle, setCurrentTestTitle] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveTestName, setSaveTestName] = useState("");

  // Add this to your state declarations
  const [highlightedSources, setHighlightedSources] = useState<Record<number, boolean>>({});

  // Add new state for short answer grading
  const [shortAnswerGrades, setShortAnswerGrades] = useState<Record<number, ShortAnswerGrade>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState<GradingProgress>({ total: 0, completed: 0 });

  // Fetch saved tests
  const savedTests = useQuery(api.tests.getByNote, { noteId }) as SavedTest[] | null;
  const note = useQuery(api.notes.get, { id: noteId });

  // We'll use the existing OpenAI action pattern from your codebase
  const getSavedTestAction = useAction(api.testGenerator.getSavedTest);
  
  // Mutations for test management
  const createTestMutation = useMutation(api.tests.create);
  const updateTestMutation = useMutation(api.tests.update);
  const removeTestMutation = useMutation(api.tests.remove);

  // Add the action hooks
  const generateTestAction = useAction(api.testGenerator.generateTest);
  const gradeShortAnswerAction = useAction(api.testGenerator.gradeShortAnswer);

  const handleGenerate = async () => {
    if (!hasValidSections) return;
    
    setIsGenerating(true);
    try {
      const selectedTypes = getSelectedQuestionTypes(questionTypes);
      
      // Ensure at least one question type is selected
      if (selectedTypes.length === 0) {
        throw new Error("Please select at least one question type");
      }

      const result = await generateTestAction({
        noteId: noteId,
        options: {
          numQuestions,
          types: selectedTypes,
          difficulty,
          sections: selectedSections,
        },
      });
      setGeneratedTest(result as GeneratedTest);
    } catch (error) {
      console.error("Error generating test:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewTest = () => {
    setGeneratedTest(null);
    setUserAnswers({});
    setIsSubmitted(false);
    setSelectedTestId(null);
  };

  const handleUserAnswer = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitTest = async () => {
    if (!generatedTest) return;
    
    setIsSubmitted(true);
    setShowAnswers(true);
    
    // Count how many short answer questions need grading
    const shortAnswerQuestions = generatedTest.questions.filter(q => q.type === "shortAnswer" && userAnswers[generatedTest.questions.indexOf(q)]);
    setGradingProgress({ total: shortAnswerQuestions.length, completed: 0 });
    
    // Grade short answer questions
    setIsGrading(true);
    const newGrades: Record<number, ShortAnswerGrade> = {};
    
    for (let i = 0; i < generatedTest.questions.length; i++) {
      const question = generatedTest.questions[i];
      const userAnswer = userAnswers[i];
      if (question.type === "shortAnswer" && userAnswer) {
        try {
          const result = await gradeShortAnswerAction({
            question: question.question,
            answer: question.answer,
            userAnswer: userAnswer,
          });
          newGrades[i] = result;
          setGradingProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        } catch (error) {
          console.error("Error grading short answer:", error);
          newGrades[i] = { score: 0, feedback: "Error grading answer" };
          setGradingProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        }
      }
    }
    
    setShortAnswerGrades(newGrades);
    setIsGrading(false);
  };

  const handleRetakeTest = () => {
    setUserAnswers({});
    setIsSubmitted(false);
  };

  useEffect(() => {
    return () => {
      const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
      if (editorEl) {
        searchHighlight.clear(editorEl);
      }
    };
  }, []);

  const handleNavigateToSource = (index: number) => {
    const question = generatedTest?.questions[index];
    if (!question?.source || !navigateToText) return;
    
    const isCurrentlyHighlighted = highlightedSources[index];
    const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
    
    if (isCurrentlyHighlighted) {
      if (editorEl) {
        searchHighlight.clear(editorEl);
      }
      setHighlightedSources(prev => ({
        ...prev,
        [index]: false
      }));
    } else {
      if (editorEl) {
        searchHighlight.clear(editorEl);
      }
      navigateToText(question.source);
      setHighlightedSources(prev => {
        const newState: Record<number, boolean> = {};
        Object.keys(prev).forEach(key => {
          newState[Number(key)] = false;
        });
        newState[index] = true;
        return newState;
      });
    }
  };

  const openSaveDialog = () => {
    if (!generatedTest) return;
    setSaveTestName(`Test ${new Date().toLocaleString()}`);
    setIsSaveDialogOpen(true);
  };

  const handleSaveTest = async () => {
    if (!generatedTest) return;
    
    try {
      await createTestMutation({
        noteId,
        title: saveTestName.trim() || `Test ${new Date().toLocaleString()}`,
        questions: generatedTest.questions,
        settings: {
          numQuestions,
          types: getSelectedQuestionTypes(questionTypes),
          difficulty,
        },
      });
      
      setIsSaveDialogOpen(false);
      alert("Test saved successfully!");
      setView("list");
    } catch (error) {
      console.error("Error saving test:", error);
    }
  };

  const handleOpenTest = async (testId: Id<"tests">) => {
    try {
      const test = await getSavedTestAction({ testId });
      setGeneratedTest(test as GeneratedTest);
      setUserAnswers({});
      setIsSubmitted(false);
      setView("generate");
      setSelectedTestId(testId);
    } catch (error) {
      console.error("Error opening test:", error);
    }
  };

  const handleDeleteTest = async (testId: Id<"tests">) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    
    try {
      await removeTestMutation({ id: testId });
      if (selectedTestId === testId) {
        setSelectedTestId(null);
        if (view === "generate") {
          setGeneratedTest(null);
        }
      }
    } catch (error) {
      console.error("Error deleting test:", error);
    }
  };

  const openRenameDialog = (testId: Id<"tests">, currentTitle?: string) => {
    setSelectedTestId(testId);
    setCurrentTestTitle(currentTitle || "Untitled Test");
    setNewTestName(currentTitle || "Untitled Test");
    setIsRenameDialogOpen(true);
  };

  const handleRenameTest = async () => {
    if (!selectedTestId || !newTestName.trim()) return;
    
    try {
      await updateTestMutation({
        id: selectedTestId,
        title: newTestName.trim(),
      });
      setIsRenameDialogOpen(false);
    } catch (error) {
      console.error("Error renaming test:", error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <TestGeneratorHeader
        view={view}
        onToggleView={() => setView(view === "generate" ? "list" : "generate")}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {view === "generate" ? (
          !generatedTest ? (
            <TestGeneratorOptions
              numQuestions={numQuestions}
              onNumQuestionsChange={setNumQuestions}
              questionTypes={questionTypes}
              onQuestionTypesChange={setQuestionTypes}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              noteContent={note?.content || ""}
              onSectionsChange={setSelectedSections}
              onValidSectionsChange={setHasValidSections}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {selectedTestId ? currentTestTitle || "Saved Test" : "Generated Test"}
                </h3>
                <div className="flex items-center">
                  <label className="text-sm mr-2">Show Answers</label>
                  <Checkbox
                    checked={showAnswers}
                    onCheckedChange={(checked) => setShowAnswers(!!checked)}
                  />
                </div>
              </div>
              
              <TestQuestionList
                generatedTest={generatedTest}
                userAnswers={userAnswers}
                onAnswerChange={handleUserAnswer}
                isSubmitted={isSubmitted}
                showAnswers={showAnswers}
                shortAnswerGrades={shortAnswerGrades}
                highlightedSources={highlightedSources}
                onToggleHighlight={handleNavigateToSource}
              />
            </div>
          )
        ) : (
          <div className="space-y-4">
            <h3 className="font-medium">Saved Tests</h3>
            <SavedTestsList
              savedTests={savedTests}
              onOpenTest={handleOpenTest}
              onRenameTest={openRenameDialog}
              onDeleteTest={handleDeleteTest}
              onSwitchToGenerate={() => setView("generate")}
            />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-4 border-t bg-muted/20">
        <TestGeneratorFooter
          view={view}
          generatedTest={generatedTest}
          isGenerating={isGenerating}
          isSubmitted={isSubmitted}
          isGrading={isGrading}
          gradingProgress={gradingProgress}
          userAnswers={userAnswers}
          selectedTestId={selectedTestId}
          onGenerate={handleGenerate}
          onSubmit={handleSubmitTest}
          onSave={openSaveDialog}
          onRetake={handleRetakeTest}
          onNewTest={handleNewTest}
          onSwitchToGenerate={() => {
            setView("generate");
            handleNewTest();
          }}
          questionTypes={questionTypes}
          hasValidSections={hasValidSections}
        />
      </div>

      <RenameDialog
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        currentTitle={currentTestTitle}
        newTestName={newTestName}
        onNewTestNameChange={setNewTestName}
        onRename={handleRenameTest}
      />

      <SaveDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        saveTestName={saveTestName}
        onSaveTestNameChange={setSaveTestName}
        onSave={handleSaveTest}
      />
    </div>
  );
} 