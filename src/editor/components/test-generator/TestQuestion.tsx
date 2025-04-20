import { Button } from "@/ui/button";
import { Input } from "@/plate-ui/input";
import { Check, X, MapPin } from "lucide-react";
import { GeneratedTest } from "./test-generator-types";
import { isAnswerCorrect } from "./test-generator-utils";

interface TestQuestionProps {
  question: GeneratedTest["questions"][0];
  index: number;
  userAnswer: string | null;
  onAnswerChange: (index: number, answer: string) => void;
  isSubmitted: boolean;
  showAnswers: boolean;
  shortAnswerGrade?: { score: number; feedback: string };
  isHighlighted: boolean;
  onToggleHighlight: (index: number) => void;
}

export function TestQuestion({
  question,
  index,
  userAnswer,
  onAnswerChange,
  isSubmitted,
  showAnswers,
  shortAnswerGrade,
  isHighlighted,
  onToggleHighlight,
}: TestQuestionProps) {
  const renderQuestionContent = () => {
    switch (question.type) {
      case "mcq":
        return (
          <div className="space-y-1.5">
            {question.options?.map((option, optionIndex) => {
              const optionLabel = String.fromCharCode(65 + optionIndex);
              const isSelected = userAnswer === optionLabel;
              const isCorrect = question.answer === option || question.answer === optionLabel;
              
              let bgClass = '';
              let borderClass = 'border-gray-300';
              
              if (isSubmitted) {
                if (isSelected && isCorrect) {
                  bgClass = 'bg-green-100 dark:bg-green-900/30';
                  borderClass = 'bg-green-500 text-white border-green-500';
                } else if (isSelected && !isCorrect) {
                  bgClass = 'bg-red-100 dark:bg-red-900/30';
                  borderClass = 'bg-red-500 text-white border-red-500';
                } else if (!isSelected && isCorrect && showAnswers) {
                  bgClass = 'bg-green-100 dark:bg-green-900/30';
                  borderClass = 'bg-green-500 text-white border-green-500';
                }
              } else if (isSelected) {
                bgClass = 'bg-blue-100 dark:bg-blue-900/30';
                borderClass = 'bg-blue-500 text-white border-blue-500';
              }
              
              return (
                <div 
                  key={optionIndex}
                  className={`flex items-start p-1.5 rounded-md cursor-pointer text-xs ${bgClass}`}
                  onClick={() => !isSubmitted && onAnswerChange(index, optionLabel)}
                >
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full border mr-2 ${borderClass}`}>
                    {optionLabel}
                  </div>
                  <div className="flex-1">{option}</div>
                </div>
              );
            })}
          </div>
        );
        
      case "trueFalse":
        return (
          <div className="space-y-2">
            {["True", "False"].map((option) => {
              const isSelected = userAnswer === option;
              const isCorrect = question.answer === option;
              const isIncorrect = isSubmitted && isSelected && !isCorrect;
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
                  onClick={() => !isSubmitted && onAnswerChange(index, option)}
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
        );
        
      case "fillInBlank":
        return (
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Your answer"
              value={userAnswer || ""}
              onChange={(e) => !isSubmitted && onAnswerChange(index, e.target.value)}
              disabled={isSubmitted}
              className={`${
                isSubmitted && isAnswerCorrect(question, userAnswer || "") && showAnswers ? 'border-green-500' : ''
              } ${
                isSubmitted && !isAnswerCorrect(question, userAnswer || "") && showAnswers ? 'border-red-500' : ''
              }`}
            />
          </div>
        );
        
      case "shortAnswer":
        return (
          <div className="space-y-2">
            <textarea
              placeholder="Your answer"
              value={userAnswer || ""}
              onChange={(e) => !isSubmitted && onAnswerChange(index, e.target.value)}
              disabled={isSubmitted}
              className="w-full p-2 border rounded-md min-h-[100px]"
            />
            {isSubmitted && shortAnswerGrade && (
              <div className="mt-2 p-3 rounded-md bg-muted/50">
                <div className="text-sm font-medium">
                  {shortAnswerGrade.score === 1 ? "Correct" : "Incorrect"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {shortAnswerGrade.feedback}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="p-4 border rounded-md space-y-3 text-sm text-left">
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-muted-foreground">
            Question {index + 1}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            • {question.type === "mcq" ? "Multiple Choice" : 
               question.type === "shortAnswer" ? "Short Answer" : 
               question.type === "trueFalse" ? "True/False" : 
               "Fill in the Blank"}
          </span>
          {isSubmitted && (
            <>
              {question.type === "shortAnswer" ? (
                shortAnswerGrade?.score === 1 ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )
              ) : userAnswer === null ? (
                <X className="w-4 h-4 text-red-500" />
              ) : isAnswerCorrect(question, userAnswer) ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-red-500" />
              )}
            </>
          )}
        </div>
        {showAnswers && question.source && (
          <Button
            variant={isHighlighted ? "default" : "ghost"}
            size="sm"
            className={`text-xs h-5 px-2 ${isHighlighted ? "bg-blue-500 text-white hover:bg-blue-600" : ""}`}
            onClick={() => onToggleHighlight(index)}
          >
            <MapPin className="w-3 h-3 mr-1" />
            {isHighlighted ? "Hide in Notes" : "Find in Notes"}
          </Button>
        )}
      </div>
      
      <div className="font-medium text-sm text-left">
        {question.question}
      </div>
      
      {renderQuestionContent()}
      
      {showAnswers && (
        <div className="mt-2 text-left">
          <div className="text-xs font-medium text-muted-foreground">
            Answer: <span className="text-foreground">{question.answer}</span>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground italic p-1.5 border-l-2 border-muted">
            <span className="font-medium">Source:</span> "{question.source}"
          </div>
        </div>
      )}
    </div>
  );
} 