import { Slider } from "@/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Checkbox } from "@/ui/checkbox";
import { QuestionTypes } from "./test-generator-types";

interface TestGeneratorOptionsProps {
  numQuestions: number;
  onNumQuestionsChange: (value: number) => void;
  questionTypes: QuestionTypes;
  onQuestionTypesChange: (types: QuestionTypes) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
}

export function TestGeneratorOptions({
  numQuestions,
  onNumQuestionsChange,
  questionTypes,
  onQuestionTypesChange,
  difficulty,
  onDifficultyChange,
}: TestGeneratorOptionsProps) {
  return (
    <div className="space-y-4 text-left">
      <div>
        <label className="text-sm font-medium block text-left">Number of Questions: {numQuestions}</label>
        <Slider
          value={[numQuestions]}
          min={1}
          max={20}
          step={1}
          onValueChange={(value) => onNumQuestionsChange(value[0])}
          className="mt-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium block text-left">Question Types</label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mcq"
              checked={questionTypes.mcq}
              onCheckedChange={(checked) =>
                onQuestionTypesChange({ ...questionTypes, mcq: !!checked })
              }
            />
            <label htmlFor="mcq" className="text-sm text-left">
              Multiple Choice
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="shortAnswer"
              checked={questionTypes.shortAnswer}
              onCheckedChange={(checked) =>
                onQuestionTypesChange({ ...questionTypes, shortAnswer: !!checked })
              }
            />
            <label htmlFor="shortAnswer" className="text-sm text-left">
              Short Answer
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="trueFalse"
              checked={questionTypes.trueFalse}
              onCheckedChange={(checked) =>
                onQuestionTypesChange({ ...questionTypes, trueFalse: !!checked })
              }
            />
            <label htmlFor="trueFalse" className="text-sm text-left">
              True/False
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="fillInBlank"
              checked={questionTypes.fillInBlank}
              onCheckedChange={(checked) =>
                onQuestionTypesChange({ ...questionTypes, fillInBlank: !!checked })
              }
            />
            <label htmlFor="fillInBlank" className="text-sm text-left">
              Fill in the Blank
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block text-left">Difficulty</label>
        <RadioGroup
          value={difficulty}
          onValueChange={onDifficultyChange}
          className="mt-2 flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="easy" id="easy" />
            <label htmlFor="easy" className="text-sm text-left">Easy</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="medium" id="medium" />
            <label htmlFor="medium" className="text-sm text-left">Medium</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hard" id="hard" />
            <label htmlFor="hard" className="text-sm text-left">Hard</label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
} 