# Project Proposal

We are building a sophisticated note taking application that combines traditional document editing capabilities with AI-powered features to enhance the note-taking, studying and writing experience.

## Functional Requirements

### Primary Features (Must Haves)

As a User, I want to:

1. User sign in
2. Note creation and storage system. Ability to create multiple documents
3. General text editing
4. Full-text search for keyword search. Similar to cmd f . Could also add find and replace
5. Autocomplete text generation (comes with novel)
6. Chat interface with Notes – Semantic Search through the document, can "chat" with it (maybe with a chat sidebar similar to cursor).
7. Create outline or proper structure for text – this is after writing it would organize a user's notes into organized sections with headings and subheadings. Splits the notes from one large block of text into organized sections.

### Secondary Features (Should Haves)

As a User, I want to:

1. Text summarization for complex topics or large text and ask to expand upon pieces of their notes. Users can highlight text and ask for it to be explained simply.
2. Fix spelling and grammar, shorten, lengthen, paraphrase
3. Concept Map Generation: AI extracts key ideas from notes, connecting different topics in a concise paragraph
4. Generate mock test questions based on notes to help prepare for an exam. This is needed as a user will look over their notes to study, so making test questions from their notes is a reasonable and useful feature.

### Tertiary Features (Nice to Haves)

As a User, I want to:

1. Ability to share with friends via email - this would be a read-only view of the document with the option to create your own copy in our application
2. Save notes as PDF to desktop

### Won't have features

As a User, I want to:

1. Real-time collaborative document editing
2. Inserting tables for easy data visualization
3. Inserting images (diagrams, graphs, screenshots, etc)
4. Ability to comment on a specific region of text
5. Scan notes and perform google search for further exploration on topics covered in notes
6. Use open tabs on browser as context for autocompletions
7. Speech-to-text for lecture note transcription - can upload audio recording

## Tech Stack

### Frontend

1. Novel
2. Framework: React
3. Styling: TailWindCSS and Shadcn UI
4. State Management: Nanostores
5. Routing: Nanostores router libraries
6. Build Tool: Vite
7. Deployment: Netlify

### Backend

1. Backend as a Service: Convex for authentication, storage, database, vector database, and serverless functions
2. Django: for serverless functions for backend logic convex does not support. Will make a Django REST API for python libraries without equivalent in TypeScript.
3. Pinecone: may need to use pinecone for embeddings instead of Convex if convex does not support most of our backend logic.
4. AI Integration: Vercel AI SDK

### AI Services

1. LLM : Open AI GPT-4o or GPT-4o-mini depending on inference pricing / performance
2. Embedding models: OpenAI’s text-embedding-3-small for semantic search and similarity
3. Tool Calling: OpenAI’s assistant API provides tool calling capabilities to create agentic AI behavior

### Project Roadmap

### Sprint 1: March 10 - April 4

### Week 8 (March 10 - 14): Project Setup and Auth

#### Tasks

1. Set up project repository with React, Vite, Novel, TailwindCSS and Shadcn
   - Create a project structure and configuration build tools
   - Set up code linting and formatting tools
   - Configure deployment pipeline
2. Implement user authentication (primary feature 1)
   - Implement GitHub OAuth with convex
   - Create user profile data structure
   - Implement signin/sign out functionality
   - Set up protected routes
3. Design and implement DB schema
   - Users, notes, chats with AI
   - Setup convex db configuration
   - Create data models and relationships
4. Basic text editing features (primary feature #3)
   - Integrate Novel
   - Allow users to type and change fonts, sizes, italicize, bold, etc

#### Deliverables:

- Functioning github authentication system
- Project repository with CI/CD setup
- Database schema documentation
- Basic text editing functionality

### Week 10 (March 24-28): Note Management System

#### Tasks:

1. Implement note creation and organization (primary feature #2 and #3)
   - Create a document storage with a UI for users to open documents
   - Implement create and delete document operations for users to create and delete documents (CRUD operations)
2. Add full-text search for keyword lookup (similat to Ctrl+F) using convex (primary feature #4)
3. Begin implementing basic AI integration
   - Set up Vercel AI SDK
   - Configure API connections to LLMs
   - Create service layer for AI interactions
   - Implement error handling for AI services
4. Develop UI component library
   - Build reusable UI components (buttons, notes)
   - Create chat box sidebar in notes
   - Create layout of notes
   - Implement responsive design

#### Deliverables:

- Complete document management system (create, store, delete, search)
- Initial AI service integration
- Interactive user interfaces and core document editing features.
- Basic ui components

### Week 11 (March 31- April 4): AI Enhanced Content & Semantic Search

#### Tasks:

1. Implement a chat interface with the Notes (primary feature #6)
   - Allow user to chat with notes using semantic search as context
2. Autocomplete text generation (primary feature #5)
   - This basic functionality is integrated with Novel. We need to figure out how it works
3. Create outline and proper structure from text (feature #7)
   - this is after writing it would organize a user's notes into organized sections with headings and subheadings. Splits the notes from one large block of text into organized sections.
4. Sprint1 Wrap up
   - Conduct testing of all implemented features
   - Fix critical bugs and issues
   - Deploy sprint 1 milestone for demonstration

#### Deliverables:

- AI-enhanced chat with semantic search across notes
- AI autocomplete
- AI-generated outline
- Presentation of sprint 1 accomplishments

### Sprint 2: March 7 - April 28

#### Week 12 (April 7 - 11): Advanced AI Features

#### Tasks:

1. Text summarization for complex topics or large text (Secondary feature #1)
   - Users can highlight text and ask for it to be explained simply.
2. Users can ask for the AI to expand upon certain areas of their notes
   - ie add a sub bullet underneath a bullet explaining something
3. Fix spelling and grammar, shorten, lengthen, paraphrase
4. Concept Map Generation: (Secondary feature #3)
   - AI extracts key ideas from notes, connecting different topics in a concise paragraph
5. Generate mock test questions (secondary feature #4)
   - Exam format selection (mcq/short answer)
   - Generate mock test questions based on the note content

#### Deliverables:

- Text summarization functionality
- AI based note expansion
- Concept map generation feature
- Mock test question generator

#### Week 13 (April 14 - 18): User features

#### Tasks:

1. Ability to share with friends via email - this would be a read-only view of the document with the option to create your own copy in our application (tertiary feature (#1)
2. Save notes as PDF to desktop (tertiary feature #2)

#### Deliverables:

- Shareable document links
- PDF export

#### Week 14 (April 21 - 25): Test & Finalize

#### Tasks:

1. Conduct comprehensive testing and quality assurance
   - Perform usability testing with representative users
   - Identify and fix bugs and issues
   - Optimize performance and responsiveness
   - Ensure accessibility compliance
2. Final deployment and project wrap-up
   - Deploy final application version
   - Verify all features are working in production
   - Create presentation materials
   - Prepare for project demonstration

#### Deliverables:

- Production-ready app
- Presentation materials for project demonstration

#### Key Milestones:

- March 14: Core authentication + basic editor operational
- March 28: Full document management system live
- April 4: Primary AI features complete (Sprint 1 Demo)
- April 11: Study-focused AI tools ready
- April 18: Collaboration features complete
- April 25: Application finalized and comprehensive testing and bug fixing
- April 28: Final project submission and demo
