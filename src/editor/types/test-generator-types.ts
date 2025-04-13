// Define the TypeScript interfaces for the test generator
import { Id } from "../../../convex/_generated/dataModel";

export interface MCQQuestion {
  type: "mcq";
  question: string;
  options: string[];
  answer: string;
  source?: string;
}

export interface ShortAnswerQuestion {
  type: "shortAnswer";
  question: string;
  answer: string;
  source?: string;
}

export interface TrueFalseQuestion {
  type: "trueFalse";
  question: string;
  answer: "True" | "False";
  source?: string;
}

export interface FillInBlankQuestion {
  type: "fillInBlank";
  question: string;
  answer: string;
  source?: string;
}

export type GeneratedQuestion = MCQQuestion | ShortAnswerQuestion | TrueFalseQuestion | FillInBlankQuestion;

export interface GeneratedTest {
  questions: GeneratedQuestion[];
}

export type TestGeneratorSidebarProps = {
  onClose: () => void;
  noteId: Id<"notes">;
  navigateToText?: (text: string) => void;
}; 