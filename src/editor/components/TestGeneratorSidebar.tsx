import { Button } from "@/ui/button";
import { XIcon, BookOpen, CheckCircle, RefreshCw, BookOpenText, Trash2, Edit, Save, List } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Slider } from "@/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Checkbox } from "@/ui/checkbox";
import { useState, useEffect } from "react";
import { searchHighlight } from "@/editor/plugins/searchHighlightPlugin";
import { Input } from "@/plate-ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/plate-ui/dialog";
import { 
  GeneratedTest, 
  TestGeneratorSidebarProps 
} from "../types/test-generator-types";

export default function TestGeneratorSidebar({ onClose, noteId, navigateToText }: TestGeneratorSidebarProps) {
  // State for test generation options
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionTypes, setQuestionTypes] = useState({
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

  // Fetch saved tests
  const savedTests = useQuery(api.tests.getByNote, { noteId });

  // We'll use the existing OpenAI action pattern from your codebase
  const generateTestAction = useAction(api.testGenerator.generateTest);
  const getSavedTestAction = useAction(api.testGenerator.getSavedTest);
  
  // Mutations for test management
  const createTestMutation = useMutation(api.tests.create);
  const updateTestMutation = useMutation(api.tests.update);
  const removeTestMutation = useMutation(api.tests.remove);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTestAction({
        noteId: noteId,
        options: {
          numQuestions,
          types: Object.entries(questionTypes)
            .filter(([_, selected]) => selected)
            .map(([type]) => type),
          difficulty,
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

  const handleSubmitTest = () => {
    setIsSubmitted(true);
    setShowAnswers(true);
  };

  const isAnswerCorrect = (questionIndex: number) => {
    if (!generatedTest || !isSubmitted) return null;
    
    const question = generatedTest.questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    
    if (!userAnswer) return false;
    
    if (question.type === "mcq") {
      // The answer might be the full text of the option or just the option label
      const optionIndex = "ABCDEFGH".indexOf(userAnswer);
      if (optionIndex >= 0 && question.options) {
        // If user selected A, B, C, D, check if the correct answer is the corresponding option text
        return question.answer === question.options[optionIndex] || 
               question.answer === userAnswer;
      }
      return false;
    } else if (question.type === "trueFalse") {
      return question.answer.toLowerCase() === userAnswer.toLowerCase();
    } else if (question.type === "fillInBlank") {
      return question.answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
    }
    
    return null;
  };

  // Add this function to calculate the score
  const calculateScore = () => {
    if (!generatedTest || !isSubmitted) return { correct: 0, total: 0 };
    
    // Only count questions that can be automatically graded (exclude short answer)
    const gradableQuestions = generatedTest.questions.filter(q => q.type !== "shortAnswer");
    
    const correct = gradableQuestions.reduce((count, _, index) => {
      return isAnswerCorrect(index) === true ? count + 1 : count;
    }, 0);
    
    return { correct, total: gradableQuestions.length };
  };

  // Add this function to handle retaking the test
  const handleRetakeTest = () => {
    // Reset user answers and submission state but keep the same test
    setUserAnswers({});
    setIsSubmitted(false);
  };

  // Add this useEffect to clear highlights when component unmounts
  useEffect(() => {
    // Return cleanup function that will run when component unmounts
    return () => {
      // Find the editor element
      const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
      if (editorEl) {
        // Clear any existing highlights
        searchHighlight.clear(editorEl);
      }
    };
  }, []);

  // Update the handleNavigateToSource function
  const handleNavigateToSource = (source: string | undefined, index: number) => {
    if (!source || !navigateToText) return;
    
    // Toggle the highlight state for this question
    const isCurrentlyHighlighted = highlightedSources[index];
    
    // Find the editor element
    const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
    
    if (isCurrentlyHighlighted) {
      // If already highlighted, clear the highlight
      if (editorEl) {
        searchHighlight.clear(editorEl);
      }
      
      // Update state
      setHighlightedSources(prev => ({
        ...prev,
        [index]: false
      }));
    } else {
      // Clear any existing highlights first
      if (editorEl) {
        searchHighlight.clear(editorEl);
      }
      
      // Highlight the new source
      navigateToText(source);
      
      // Update state
      setHighlightedSources(prev => {
        // Reset all to false, then set this one to true
        const newState: Record<number, boolean> = {};
        Object.keys(prev).forEach(key => {
          newState[Number(key)] = false;
        });
        newState[index] = true;
        return newState;
      });
    }
  };

  // New functions for test management
  const openSaveDialog = () => {
    if (!generatedTest) return;
    setSaveTestName(`Test ${new Date().toLocaleString()}`);
    setIsSaveDialogOpen(true);
  };

  const handleSaveTest = async () => {
    if (!generatedTest) return;
    
    try {
      const testId = await createTestMutation({
        noteId,
        title: saveTestName.trim() || `Test ${new Date().toLocaleString()}`,
        questions: generatedTest.questions,
        settings: {
          numQuestions,
          types: Object.entries(questionTypes)
            .filter(([_, selected]) => selected)
            .map(([type]) => type),
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

  const openRenameDialog = (testId: Id<"tests">, currentTitle: string) => {
    setSelectedTestId(testId);
    setCurrentTestTitle(currentTitle);
    setNewTestName(currentTitle);
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
    <div className="flex flex-col h-full overflow-hidden bg-background" style={{textAlign: 'left'}}>
      {/* Header - fixed at top */}
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
            onClick={() => setView(view === "generate" ? "list" : "generate")}
            className="text-xs"
          >
            {view === "generate" ? (
              <><List className="w-3 h-3 mr-1" /> Saved Tests</>
            ) : (
              <><BookOpen className="w-3 h-3 mr-1" /> New Test</>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Area - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{textAlign: 'left'}}>
        {view === "generate" ? (
          !generatedTest ? (
            <>
              <div className="space-y-4" style={{textAlign: 'left'}}>
                <div style={{textAlign: 'left'}}>
                  <label className="text-sm font-medium" style={{textAlign: 'left', display: 'block'}}>Number of Questions: {numQuestions}</label>
                  <Slider
                    value={[numQuestions]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={(value) => setNumQuestions(value[0])}
                    className="mt-2"
                  />
                </div>

                <div style={{textAlign: 'left'}}>
                  <label className="text-sm font-medium" style={{textAlign: 'left', display: 'block'}}>Question Types</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mcq"
                        checked={questionTypes.mcq}
                        onCheckedChange={(checked) =>
                          setQuestionTypes({ ...questionTypes, mcq: !!checked })
                        }
                      />
                      <label htmlFor="mcq" className="text-sm" style={{textAlign: 'left'}}>
                        Multiple Choice
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shortAnswer"
                        checked={questionTypes.shortAnswer}
                        onCheckedChange={(checked) =>
                          setQuestionTypes({ ...questionTypes, shortAnswer: !!checked })
                        }
                      />
                      <label htmlFor="shortAnswer" className="text-sm" style={{textAlign: 'left'}}>
                        Short Answer
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="trueFalse"
                        checked={questionTypes.trueFalse}
                        onCheckedChange={(checked) =>
                          setQuestionTypes({ ...questionTypes, trueFalse: !!checked })
                        }
                      />
                      <label htmlFor="trueFalse" className="text-sm" style={{textAlign: 'left'}}>
                        True/False
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fillInBlank"
                        checked={questionTypes.fillInBlank}
                        onCheckedChange={(checked) =>
                          setQuestionTypes({ ...questionTypes, fillInBlank: !!checked })
                        }
                      />
                      <label htmlFor="fillInBlank" className="text-sm" style={{textAlign: 'left'}}>
                        Fill in the Blank
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{textAlign: 'left'}}>
                  <label className="text-sm font-medium" style={{textAlign: 'left', display: 'block'}}>Difficulty</label>
                  <RadioGroup
                    value={difficulty}
                    onValueChange={(value) => setDifficulty(value)}
                    className="mt-2 flex space-x-4"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="easy" id="easy" />
                      <label htmlFor="easy" className="text-sm">Easy</label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="medium" id="medium" />
                      <label htmlFor="medium" className="text-sm">Medium</label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="hard" id="hard" />
                      <label htmlFor="hard" className="text-sm">Hard</label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </>
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
              
              <div className="space-y-6 mb-4">
                {generatedTest.questions.map((question, index) => (
                  <div key={index} className="p-4 border rounded-md space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Question {index + 1} • {question.type === "mcq" ? "Multiple Choice" : 
                                              question.type === "shortAnswer" ? "Short Answer" : 
                                              question.type === "trueFalse" ? "True/False" : 
                                              "Fill in the Blank"}
                      </span>
                      {showAnswers && question.source && (
                        <Button
                          variant={highlightedSources[index] ? "default" : "ghost"}
                          size="sm"
                          className={`text-xs h-5 px-2 ${highlightedSources[index] ? "bg-blue-500 text-white hover:bg-blue-600" : ""}`}
                          onClick={() => handleNavigateToSource(question.source, index)}
                        >
                          <BookOpenText className="w-3 h-3 mr-1" />
                          {highlightedSources[index] ? "Hide in Notes" : "Find in Notes"}
                        </Button>
                      )}
                    </div>
                    
                    <div className="font-medium text-sm">
                      {question.question}
                    </div>
                    
                    {question.type === "mcq" && (
                      <div className="space-y-1.5">
                        {question.options.map((option, optionIndex) => {
                          const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, D...
                          const isSelected = userAnswers[index] === optionLabel;
                          
                          // Check if this option is the correct answer
                          const isCorrect = question.answer === option || question.answer === optionLabel;
                          
                          // Determine styling based on submission state and correctness
                          let bgClass = '';
                          let borderClass = 'border-gray-300';
                          
                          if (isSubmitted) {
                            if (isSelected && isCorrect) {
                              // Selected and correct - should be green
                              bgClass = 'bg-green-100 dark:bg-green-900/30';
                              borderClass = 'bg-green-500 text-white border-green-500';
                            } else if (isSelected && !isCorrect) {
                              // Selected but incorrect - should be red
                              bgClass = 'bg-red-100 dark:bg-red-900/30';
                              borderClass = 'bg-red-500 text-white border-red-500';
                            } else if (!isSelected && isCorrect && showAnswers) {
                              // Not selected but is the correct answer (show when answers are visible)
                              bgClass = 'bg-green-100 dark:bg-green-900/30';
                              borderClass = 'bg-green-500 text-white border-green-500';
                            }
                          } else if (isSelected) {
                            // Selected but not submitted yet
                            bgClass = 'bg-blue-100 dark:bg-blue-900/30';
                            borderClass = 'bg-blue-500 text-white border-blue-500';
                          }
                          
                          return (
                            <div 
                              key={optionIndex}
                              className={`flex items-start p-1.5 rounded-md cursor-pointer text-xs ${bgClass}`}
                              onClick={() => !isSubmitted && handleUserAnswer(index, optionLabel)}
                            >
                              <div className={`flex items-center justify-center w-5 h-5 rounded-full border mr-2 ${borderClass}`}>
                                {optionLabel}
                              </div>
                              <div className="flex-1">{option}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {question.type === "trueFalse" && (
                      <div className="space-y-2">
                        {["True", "False"].map((option) => {
                          const isSelected = userAnswers[index] === option;
                          const isCorrect = question.answer === option;
                          // Only mark as incorrect if it's selected, submitted, and NOT correct
                          const isIncorrect = isSubmitted && isSelected && !isCorrect;
                          // Highlight as correct if it IS the correct answer, submitted, and showing answers
                          const highlightCorrectAnswer = isSubmitted && isCorrect && showAnswers;
                          
                          return (
                            <div 
                              key={option}
                              className={`flex items-center p-2 rounded-md cursor-pointer ${
                                isSelected && !isSubmitted ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                              } ${
                                highlightCorrectAnswer ? 'bg-green-100 dark:bg-green-900/30' : ''
                              } ${
                                isIncorrect ? 'bg-red-100 dark:bg-red-900/30' : ''
                              }`}
                              onClick={() => !isSubmitted && handleUserAnswer(index, option)}
                            >
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full border mr-2 ${
                                isSelected && !isSubmitted ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'
                              } ${
                                highlightCorrectAnswer ? 'bg-green-500 text-white border-green-500' : ''
                              } ${
                                isIncorrect ? 'bg-red-500 text-white border-red-500' : ''
                              }`}>
                                {option[0]}
                              </div>
                              <div>{option}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {question.type === "fillInBlank" && (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Your answer"
                          value={userAnswers[index] || ""}
                          onChange={(e) => !isSubmitted && handleUserAnswer(index, e.target.value)}
                          disabled={isSubmitted}
                          className={`${
                            isSubmitted && isAnswerCorrect(index) && showAnswers ? 'border-green-500' : ''
                          } ${
                            isSubmitted && isAnswerCorrect(index) === false && showAnswers ? 'border-red-500' : ''
                          }`}
                        />
                      </div>
                    )}
                    
                    {question.type === "shortAnswer" && (
                      <div className="space-y-2">
                        <textarea
                          placeholder="Your answer"
                          value={userAnswers[index] || ""}
                          onChange={(e) => !isSubmitted && handleUserAnswer(index, e.target.value)}
                          disabled={isSubmitted}
                          className="w-full p-2 border rounded-md min-h-[100px]"
                        />
                      </div>
                    )}
                    
                    {showAnswers && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Answer: <span className="text-foreground">{question.answer}</span>
                        </div>
                        <div className="mt-1.5 text-xs text-muted-foreground italic p-1.5 border-l-2 border-muted">
                          <span className="font-medium">Source:</span> "{question.source}"
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <h3 className="font-medium">Saved Tests</h3>
            
            {savedTests && savedTests.length > 0 ? (
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
                        onClick={() => handleOpenTest(test._id)}
                        title="Open Test"
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openRenameDialog(test._id, test.title)}
                        title="Rename Test"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteTest(test._id)}
                        title="Delete Test"
                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border rounded-md bg-muted/10">
                <p className="text-muted-foreground">No saved tests yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setView("generate")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Your First Test
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/20">
        {view === "generate" ? (
          !generatedTest ? (
            <Button 
              onClick={handleGenerate} 
              className="w-full"
              disabled={isGenerating || !Object.values(questionTypes).some(Boolean)}
            >
              {isGenerating ? (
                <>
                  <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Generate Test
                </>
              )}
            </Button>
          ) : isSubmitted ? (
            <div className="text-center">
              {/* Display the score here */}
              <p className="text-sm mb-2 font-medium">
                Score: {calculateScore().correct} of {calculateScore().total} correct
                {calculateScore().total > 0 && 
                  ` (${Math.round((calculateScore().correct / calculateScore().total) * 100)}%)`}
              </p>
              <div className="flex space-x-2">
                {!selectedTestId && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={openSaveDialog}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Test
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={handleRetakeTest}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake Test
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={handleNewTest}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Test
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              className="w-full"
              onClick={handleSubmitTest}
              disabled={Object.keys(userAnswers).length === 0}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit Answers
            </Button>
          )
        ) : (
          <Button 
            onClick={() => {
              setView("generate");
              handleNewTest();
            }} 
            className="w-full"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Create New Test
          </Button>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Test</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              placeholder="Enter new test name"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameTest} disabled={!newTestName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Test Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Test</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={saveTestName}
              onChange={(e) => setSaveTestName(e.target.value)}
              placeholder="Enter test name"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTest} disabled={!saveTestName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 