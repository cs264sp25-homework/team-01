import { Id } from "../../../../convex/_generated/dataModel";

export interface GeneratedTest {
  questions: Array<{
    question: string;
    answer: string;
    type: "mcq" | "shortAnswer" | "trueFalse" | "fillInBlank";
    options?: string[];
    source?: string;
  }>;
}

export interface TestGeneratorSidebarProps {
  onClose: () => void;
  noteId: Id<"notes">;
  navigateToText: (text: string) => void;
}

export interface QuestionTypes {
  mcq: boolean;
  shortAnswer: boolean;
  trueFalse: boolean;
  fillInBlank: boolean;
}

export interface GradingProgress {
  total: number;
  completed: number;
}

export interface ShortAnswerGrade {
  score: number;
  feedback: string;
}

export interface NoteNode {
  type: string;
  children: Array<{
    text: string;
    bold?: boolean;
    fontSize?: string;
    underline?: boolean;
    italic?: boolean;
  }>;
  id?: string;
  indent?: number;
  listStyleType?: string;
  listStart?: number;
  align?: string;
} 