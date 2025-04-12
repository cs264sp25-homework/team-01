import { Button } from "@/ui/button";
import { XIcon, BookOpen, CheckCircle, RefreshCw, BookOpenText } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Slider } from "@/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Checkbox } from "@/ui/checkbox";
import { useState, useEffect } from "react";
import { searchHighlight } from "@/editor/plugins/searchHighlightPlugin";

// Define the TypeScript interfaces for the test generator
interface MCQQuestion {
  type: "mcq";
  question: string;
  options: string[];
  answer: string;
  source?: string;
}

interface ShortAnswerQuestion {
  type: "shortAnswer";
  question: string;
  answer: string;
  source?: string;
}

interface TrueFalseQuestion {
  type: "trueFalse";
  question: string;
  answer: "True" | "False";
  source?: string;
}

interface FillInBlankQuestion {
  type: "fillInBlank";
  question: string;
  answer: string;
  source?: string;
}

type GeneratedQuestion = MCQQuestion | ShortAnswerQuestion | TrueFalseQuestion | FillInBlankQuestion;

interface GeneratedTest {
  questions: GeneratedQuestion[];
}

type TestGeneratorSidebarProps = {
  onClose: () => void;
  noteId: Id<"notes">;
  navigateToText?: (text: string) => void;
};

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
  const [showAnswers, setShowAnswers] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | null>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // We'll use the existing OpenAI action pattern from your codebase
  const generateTestAction = useAction(api.testGenerator.generateTest);

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
  };

  const handleUserAnswer = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitTest = () => {
    setIsSubmitted(true);
  };

  const isAnswerCorrect = (questionIndex: number) => {
    if (!generatedTest || !isSubmitted) return null;
    
    const question = generatedTest.questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    
    if (!userAnswer) return false;
    
    if (question.type === "mcq") {
      const optionIndex = "ABCDEFGH".indexOf(userAnswer);
      return question.answer === userAnswer || 
             (optionIndex >= 0 && question.answer === question.options[optionIndex]);
    } else if (question.type === "trueFalse") {
      return question.answer.toLowerCase() === userAnswer.toLowerCase();
    } else if (question.type === "fillInBlank") {
      // Simple case-insensitive comparison for fill-in-blank
      return question.answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
    }
    
    // For short answer, we don't grade
    return null;
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

  // Function to navigate to the source of a question in the notes
  const handleNavigateToSource = (source: string | undefined) => {
    if (!source || !navigateToText) return;
    
    // Add a visual indicator that the button was clicked
    const button = document.activeElement as HTMLElement;
    if (button) {
      const originalBg = button.style.backgroundColor;
      button.style.backgroundColor = '#4CAF50';
      setTimeout(() => {
        button.style.backgroundColor = originalBg;
      }, 300);
    }
    
    // Call the navigateToText function with the source text
    navigateToText(source);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background" style={{textAlign: 'left'}}>
      {/* Header - fixed at top */}
      <div className="flex items-center justify-between flex-shrink-0 p-4 border-b bg-muted/30">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">Test Generator</h3>
          <div className="flex items-center mt-1 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 mr-2 bg-blue-500 rounded-full"></span>
            Create practice questions from your notes
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Area - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{textAlign: 'left'}}>
        {!generatedTest ? (
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
                  onValueChange={setDifficulty}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="easy" id="easy" />
                    <label htmlFor="easy" className="text-sm" style={{textAlign: 'left'}}>
                      Easy
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <label htmlFor="medium" className="text-sm" style={{textAlign: 'left'}}>
                      Medium
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hard" id="hard" />
                    <label htmlFor="hard" className="text-sm" style={{textAlign: 'left'}}>
                      Hard
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div style={{textAlign: 'left'}}>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showAnswers"
                    checked={showAnswers}
                    onCheckedChange={(checked) => setShowAnswers(!!checked)}
                  />
                  <label htmlFor="showAnswers" className="text-sm" style={{textAlign: 'left'}}>
                    Show Answers (uncheck to take as a quiz)
                  </label>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4" style={{textAlign: 'left'}}>
            <div className="flex justify-between items-center">
              <h3 className="font-medium" style={{textAlign: 'left'}}>
                {showAnswers ? "Generated Test" : isSubmitted ? "Test Results" : "Test Questions"}
              </h3>
              <Button variant="outline" size="sm" onClick={handleNewTest}>
                <RefreshCw className="w-3 h-3 mr-1" />
                New Test
              </Button>
            </div>
            
            <div className="space-y-4">
              {generatedTest.questions.map((question: GeneratedQuestion, index: number) => (
                <div key={index} className="p-3 border rounded-md bg-muted/20" style={{textAlign: 'left'}}>
                  <p className="font-medium mb-2" style={{textAlign: 'left'}}>Q{index + 1}: {question.question}</p>
                  
                  {question.type === "mcq" && (
                    <div className="space-y-2 ml-2" style={{textAlign: 'left'}}>
                      {question.options.map((option: string, optIndex: number) => {
                        const optionLetter = String.fromCharCode(65 + optIndex);
                        const isSelected = userAnswers[index] === optionLetter;
                        const correctAnswer = isSubmitted && question.answer === optionLetter;
                        
                        return (
                          <div 
                            key={optIndex} 
                            className={`flex items-center space-x-2 ${!showAnswers && !isSubmitted ? "cursor-pointer hover:bg-muted/50 p-1 rounded" : ""} ${
                              isSubmitted ? (
                                correctAnswer ? "text-green-600" : 
                                isSelected ? "text-red-600" : ""
                              ) : ""
                            }`}
                            onClick={() => !showAnswers && !isSubmitted && handleUserAnswer(index, optionLetter)}
                            style={{textAlign: 'left'}}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                              isSelected ? "bg-primary text-primary-foreground" : ""
                            }`}>
                              {optionLetter}
                            </div>
                            <span className="text-sm" style={{textAlign: 'left'}}>{option}</span>
                            {isSubmitted && correctAnswer && <CheckCircle className="w-4 h-4 ml-1 text-green-600" />}
                          </div>
                        );
                      })}
                      
                      {(showAnswers || isSubmitted) && (
                        <div className="mt-2 pt-2 border-t text-sm text-green-600" style={{textAlign: 'left'}}>
                          <span className="font-medium">Answer:</span> {question.answer}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {question.type === "shortAnswer" && (
                    <div className="space-y-2 ml-2" style={{textAlign: 'left'}}>
                      {!showAnswers && (
                        <textarea
                          className="w-full p-2 border rounded-md text-sm"
                          rows={3}
                          placeholder="Type your answer here..."
                          value={userAnswers[index] || ""}
                          onChange={(e) => handleUserAnswer(index, e.target.value)}
                          disabled={isSubmitted}
                        />
                      )}
                      
                      {(showAnswers || isSubmitted) && (
                        <div className="mt-2 pt-2 border-t text-sm text-green-600" style={{textAlign: 'left'}}>
                          <span className="font-medium">Answer:</span> {question.answer}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {question.type === "trueFalse" && (
                    <div className="space-y-2 ml-2" style={{textAlign: 'left'}}>
                      {["True", "False"].map((option, optIndex) => {
                        const optionValue = option.charAt(0);
                        const isSelected = userAnswers[index] === optionValue;
                        const correctAnswer = isSubmitted && question.answer.charAt(0) === optionValue;
                        
                        return (
                          <div 
                            key={optIndex} 
                            className={`flex items-center space-x-2 ${!showAnswers && !isSubmitted ? "cursor-pointer hover:bg-muted/50 p-1 rounded" : ""} ${
                              isSubmitted ? (
                                correctAnswer ? "text-green-600" : 
                                isSelected ? "text-red-600" : ""
                              ) : ""
                            }`}
                            onClick={() => !showAnswers && !isSubmitted && handleUserAnswer(index, optionValue)}
                            style={{textAlign: 'left'}}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                              isSelected ? "bg-primary text-primary-foreground" : ""
                            }`}>
                              {optionValue}
                            </div>
                            <span className="text-sm" style={{textAlign: 'left'}}>{option}</span>
                            {isSubmitted && correctAnswer && <CheckCircle className="w-4 h-4 ml-1 text-green-600" />}
                          </div>
                        );
                      })}
                      
                      {(showAnswers || isSubmitted) && (
                        <div className="mt-2 pt-2 border-t text-sm text-green-600" style={{textAlign: 'left'}}>
                          <span className="font-medium">Answer:</span> {question.answer}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {question.type === "fillInBlank" && (
                    <div className="space-y-2 ml-2" style={{textAlign: 'left'}}>
                      {!showAnswers && (
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md text-sm"
                          placeholder="Type your answer here..."
                          value={userAnswers[index] || ""}
                          onChange={(e) => handleUserAnswer(index, e.target.value)}
                          disabled={isSubmitted}
                        />
                      )}
                      
                      {(showAnswers || isSubmitted) && (
                        <div className="mt-2 pt-2 border-t text-sm text-green-600" style={{textAlign: 'left'}}>
                          <span className="font-medium">Answer:</span> {question.answer}
                        </div>
                      )}
                      
                      {isSubmitted && userAnswers[index] && (
                        <div className={`mt-2 text-sm ${isAnswerCorrect(index) ? "text-green-600" : "text-red-600"}`}>
                          <span className="font-medium">Your answer:</span> {userAnswers[index]}
                          {isAnswerCorrect(index) && <CheckCircle className="w-4 h-4 ml-1 inline text-green-600" />}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Source navigation button - show after submission or when answers are shown */}
                  {(showAnswers || isSubmitted) && question.source && (
                    <div className="mt-3 ml-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleNavigateToSource(question.source)}
                      >
                        <BookOpenText className="w-3 h-3 mr-1" />
                        Find in Notes
                      </Button>
                      <div className="mt-2 text-xs text-muted-foreground italic p-2 border-l-2 border-muted">
                        <span className="font-medium">Source:</span> "{question.source}"
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/20">
        {!generatedTest ? (
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
        ) : showAnswers ? (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              const testContent = JSON.stringify(generatedTest, null, 2);
              const blob = new Blob([testContent], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'generated_test.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Export Test
          </Button>
        ) : isSubmitted ? (
          <div className="text-center">
            <p className="text-sm mb-2">
              {Object.values(userAnswers).filter((_, i) => isAnswerCorrect(i) === true).length} 
              {" "}of{" "}
              {generatedTest.questions.filter(q => q.type !== "shortAnswer").length} correct
            </p>
            <div className="flex space-x-2">
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
        )}
      </div>
    </div>
  );
} 