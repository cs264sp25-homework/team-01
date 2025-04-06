# Note-AI

Note-AI is a sophisticated note-taking application that combines traditional document editing capabilities with AI-powered features to enhance the note-taking, studying, and writing experience. Our application enables users to create, organize, and edit notes efficiently, while leveraging AI capabilities to generate content, organize information, and provide personalized assistance.

## Convex

This project uses [Convex](https://convex.dev/) for the backend. You need to create a free account to run the application locally.

## OpenAI API

This project uses the OpenAI API. You need to create an account and get an API key to use the API. Consult the [quick start guide](https://platform.openai.com/docs/quickstart) for instructions.

## Deployed Version

You can access the deployed version of Note-AI at:

https://cs264sp25-homework.github.io/team-01/signin 

To use the application:

1. Sign in using Github
2. Create a new note from the dashboard
3. Use the rich text editor to write and format your notes
4. Access AI features through the chat sidebar (click the message icon in the top right)
5. Use AI to help organize your notes, generate content, or answer questions about your material

## Run Locally

To run the application locally:

Clone the repository, open a terminal and navigate to the root directory of the repository. Then, install the dependencies:

```bash
pnpm install
```

Next, start the Convex development server:

```bash
npx convex dev
```

The first time you run the command, you will be asked to log into your Convex account. Follow the instructions in the terminal. It will also ask you to create a new project. You can use the default settings.

Once the development server is running, you will see a `.env.local` file in the project root. Don't modify this file directly. Don't commit this file to the repository either.

At this point, you need to set you OpenAI API key. Run the following command:

```bash
npx convex env set OPENAI_API_KEY sk-...
```

This needs to be done only once. The API key will be stored on the Convex server and will be used every time you run the development server. From this point on, you can start the Convex development server with the following command:

```bash
npx convex dev
```

Finally, run the following command to start the frontend development server.

```bash
pnpm dev
```

This will start the application on http://localhost:5173/team-01/
