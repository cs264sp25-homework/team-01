# Test Generator Documentation

## Overview
The Test Generator is a powerful component that allows users to create practice tests from their notes using AI. It supports multiple question types, difficulty levels, and provides features for saving, managing, and grading tests.

## Features
- Generate tests from notes using AI
- Multiple question types:
  - Multiple Choice (MCQ)
  - Short Answer
  - True/False
  - Fill in the Blank
- Customizable difficulty levels (Easy, Medium, Hard)
- Section-based question generation
- Test saving and management
- Automatic grading for short answer questions
- Source tracking for questions
- Test retaking capability

## Architecture

### Frontend Components
1. **TestGeneratorSidebar.tsx**
   - Main container component
   - Manages state and orchestrates other components
   - Handles test generation, submission, and management

2. **TestGeneratorHeader.tsx**
   - Navigation between generate and list views
   - Close button functionality

3. **TestGeneratorOptions.tsx**
   - Configuration interface for test generation
   - Number of questions selector
   - Question type selection
   - Difficulty level selection
   - Section selection

4. **TestQuestionList.tsx & TestQuestion.tsx**
   - Display and interaction with generated questions
   - Answer input and validation
   - Source highlighting

5. **TestGeneratorFooter.tsx**
   - Action buttons (Generate, Submit, Save, Retake)
   - Score display
   - Grading progress indicator

6. **SavedTestsList.tsx**
   - List of saved tests
   - Test management (open, rename, delete)

7. **TestGeneratorDialogs.tsx**
   - Save and rename dialogs
   - User input handling

### Backend Implementation
1. **testGenerator.ts**
   - AI-powered test generation
   - Short answer grading
   - Test retrieval

2. **tests.ts**
   - Test CRUD operations
   - Database management
   - User authentication

## Data Flow
1. **Test Generation**
   ```
   User Input → TestGeneratorOptions → generateTest Action → OpenAI API → Generated Test
   ```

2. **Test Management**
   ```
   User Action → Test CRUD Operations → Database → Frontend Update
   ```

3. **Grading Flow**
   ```
   User Submission → Short Answer Grading → OpenAI API → Score & Feedback → UI Update
   ```

## How to Extend

### Adding New Question Types
1. Update `test-generator-types.ts`:
   ```typescript
   export interface QuestionTypes {
     // Add new type
     newType: boolean;
   }
   ```

2. Modify `TestGeneratorOptions.tsx`:
   ```typescript
   // Add new checkbox in the question types section
   <Checkbox
     id="newType"
     checked={questionTypes.newType}
     onCheckedChange={(checked) =>
       onQuestionTypesChange({ ...questionTypes, newType: !!checked })
     }
   />
   ```

3. Update backend prompt in `testGenerator.ts`:
   ```typescript
   // Add new question type instructions in the system prompt
   "5. If it's a new type question, provide specific format..."
   ```

### Adding New Features
1. **New UI Components**
   - Create new component files in `src/editor/components/test-generator/`
   - Follow existing component patterns
   - Add necessary types to `test-generator-types.ts`

2. **New Backend Functionality**
   - Add new actions in `testGenerator.ts`
   - Update database schema if needed
   - Add new mutations/queries in `tests.ts`

### Best Practices
1. **State Management**
   - Keep state as close to where it's used as possible
   - Use proper TypeScript types for all state variables
   - Implement proper error handling

2. **Component Design**
   - Follow the single responsibility principle
   - Keep components small and focused
   - Use proper prop types and interfaces

3. **Testing**
   - Add unit tests for new components
   - Test edge cases and error scenarios
   - Ensure proper type checking

## Troubleshooting
1. **Test Generation Fails**
   - Check OpenAI API key configuration
   - Verify note content format
   - Check section selection

2. **Grading Issues**
   - Verify short answer format
   - Check OpenAI API response
   - Ensure proper error handling

3. **UI Issues**
   - Check component state management
   - Verify prop types
   - Ensure proper event handling

## Future Improvements
1. **Potential Enhancements**
   - Add more question types
   - Implement test sharing
   - Add test statistics and analytics
   - Support for multimedia questions
   - Export test functionality

2. **Performance Optimizations**
   - Implement caching for generated tests
   - Optimize AI prompt engineering
   - Improve response time for grading

3. **User Experience**
   - Add test preview functionality
   - Implement test templates
   - Add progress tracking
   - Support for test customization
