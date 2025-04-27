import { Slider } from "@/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Checkbox } from "@/ui/checkbox";
import { NoteNode, QuestionTypes } from "./test-generator-types";
import { useState, useEffect } from "react";

interface TestGeneratorOptionsProps {
  numQuestions: number;
  onNumQuestionsChange: (value: number) => void;
  questionTypes: QuestionTypes;
  onQuestionTypesChange: (types: QuestionTypes) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  noteContent: string;
  onSectionsChange: (sections: string[]) => void;
  onValidSectionsChange: (isValid: boolean) => void;
}

export function TestGeneratorOptions({
  numQuestions,
  onNumQuestionsChange,
  questionTypes,
  onQuestionTypesChange,
  difficulty,
  onDifficultyChange,
  noteContent,
  onSectionsChange,
  onValidSectionsChange,
}: TestGeneratorOptionsProps) {
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Parse note content to extract sections
    try {
      const parsedContent = JSON.parse(noteContent);
      const extractedSections = parsedContent
        .filter((node: NoteNode) => node.type && node.type.startsWith('h'))
        .map((node: NoteNode) => {
          const text = node.children?.map((child) => child.text).join('') || '';
          return text.trim();
        })
        .filter(Boolean);
      
      setSections(extractedSections);
      // Initialize all sections as selected
      const initialSelection = extractedSections.reduce((acc: Record<string, boolean>, section: string) => {
        acc[section] = true;
        return acc;
      }, {});
      setSelectedSections(initialSelection);
      onSectionsChange(extractedSections);
      onValidSectionsChange(extractedSections.length > 0);
    } catch (error) {
      console.error('Error parsing note content:', error);
      onValidSectionsChange(false);
    }
  }, [noteContent]);

  const handleSectionToggle = (section: string) => {
    const newSelection = {
      ...selectedSections,
      [section]: !selectedSections[section]
    };
    setSelectedSections(newSelection);
    const selectedSectionsList = Object.keys(newSelection).filter(key => newSelection[key]);
    onSectionsChange(selectedSectionsList);
    onValidSectionsChange(selectedSectionsList.length > 0);
  };

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

      {sections.length > 0 && (
        <div>
          <label className="text-sm font-medium block text-left">Sections to Include</label>
          <div className="mt-2 space-y-2">
            {sections.map((section) => (
              <div key={section} className="flex items-center space-x-2">
                <Checkbox
                  id={section}
                  checked={selectedSections[section]}
                  onCheckedChange={() => handleSectionToggle(section)}
                />
                <label htmlFor={section} className="text-sm text-left">
                  {section}
                </label>
              </div>
            ))}
          </div>
          {Object.values(selectedSections).every(value => !value) && (
            <p className="text-sm text-red-500 mt-2">Please select at least one section to generate a test.</p>
          )}
        </div>
      )}
    </div>
  );
} 