import { GeneratedTest } from "./test-generator-types";
import { TestQuestion } from "./TestQuestion";

interface TestQuestionListProps {
  generatedTest: GeneratedTest;
  userAnswers: Record<number, string | null>;
  onAnswerChange: (index: number, answer: string) => void;
  isSubmitted: boolean;
  showAnswers: boolean;
  shortAnswerGrades: Record<number, { score: number; feedback: string }>;
  highlightedSources: Record<number, boolean>;
  onToggleHighlight: (index: number) => void;
}

export function TestQuestionList({
  generatedTest,
  userAnswers,
  onAnswerChange,
  isSubmitted,
  showAnswers,
  shortAnswerGrades,
  highlightedSources,
  onToggleHighlight,
}: TestQuestionListProps) {
  return (
    <div className="space-y-6 mb-4">
      {generatedTest.questions.map((question, index) => (
        <TestQuestion
          key={index}
          question={question}
          index={index}
          userAnswer={userAnswers[index] || null}
          onAnswerChange={onAnswerChange}
          isSubmitted={isSubmitted}
          showAnswers={showAnswers}
          shortAnswerGrade={shortAnswerGrades[index]}
          isHighlighted={highlightedSources[index] || false}
          onToggleHighlight={onToggleHighlight}
        />
      ))}
    </div>
  );
} 