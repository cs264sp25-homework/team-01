import { GeneratedTest, QuestionTypes } from "./test-generator-types";

export const getSelectedQuestionTypes = (questionTypes: QuestionTypes): string[] => {
  return Object.entries(questionTypes)
    .filter(([, selected]) => selected)
    .map(([type]) => type);
};

export const calculateScore = (
  generatedTest: GeneratedTest | null,
  userAnswers: Record<number, string | null>,
  shortAnswerGrades: Record<number, { score: number; feedback: string }>,
  isSubmitted: boolean
) => {
  if (!generatedTest || !isSubmitted) return { correct: 0, total: 0 };
  
  let correct = 0;
  const total = generatedTest.questions.length;
  
  for (let i = 0; i < generatedTest.questions.length; i++) {
    const question = generatedTest.questions[i];
    const userAnswer = userAnswers[i];
    
    if (!userAnswer) continue;
    
    if (question.type === "shortAnswer") {
      correct += shortAnswerGrades[i]?.score || 0;
    } else if (isAnswerCorrect(question, userAnswer)) {
      correct += 1;
    }
  }
  
  return { correct, total };
};

export const isAnswerCorrect = (question: GeneratedTest["questions"][0], userAnswer: string): boolean => {
  if (question.type === "mcq") {
    const optionIndex = "ABCDEFGH".indexOf(userAnswer);
    if (optionIndex >= 0 && question.options) {
      return question.answer === question.options[optionIndex] || 
             question.answer === userAnswer;
    }
    return false;
  } else if (question.type === "trueFalse") {
    return question.answer.toLowerCase() === userAnswer.toLowerCase();
  } else if (question.type === "fillInBlank") {
    return question.answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
  }
  return false;
}; 