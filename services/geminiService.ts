import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    setupInstructions: {
      type: Type.STRING,
      description: "A detailed, step-by-step plain text guide on how to install dependencies and run the project locally. Assumes the user has the code. Do not use Markdown formatting. Include commands for installation and running the project."
    },
    defaultBranch: {
      type: Type.STRING,
      description: "The default branch name of the repository (e.g., 'main', 'master')."
    },
    isNodeProject: {
      type: Type.BOOLEAN,
      description: "A boolean value that is true if the repository is a standard Node.js web application (e.g., React, Vue, Next.js, Vite) that can be run with 'npm install' and 'npm start' or a similar dev script. Should be false for non-Node.js projects (Python, Java, Go) or non-runnable libraries."
    }
  },
  required: ["setupInstructions", "defaultBranch", "isNodeProject"]
};

export const analyzeRepo = async (repoUrl: string): Promise<AnalysisResult> => {
  const prompt = `
    Analyze the public GitHub repository at this URL: ${repoUrl}.

    Based on your analysis of the file structure and key files (like README.md, package.json, etc.), provide the following three things in a single JSON object:

    1.  **setupInstructions**: A detailed, step-by-step plain text guide on how to get the project running locally, assuming the user already has the code. Include:
        *   Prerequisites (like Node.js version, etc.).
        *   Installing dependencies (exact commands).
        *   Running the application (exact commands, prefer dev servers like 'npm run dev' over 'npm start' if available).
        *   Mention any environment variables needed (e.g., from a \`.env.example\` file).
        The output for this key should be a single string of plain text, not markdown. Do NOT include instructions on how to clone or download the repository.

    2. **defaultBranch**: The name of the default branch for the repository (e.g., "main" or "master"). Provide only the branch name as a string.
    
    3. **isNodeProject**: A boolean value. Set this to \`true\` if the project is a standard Node.js-based web application (like React, Vue, Next.js, Vite, Express) that has a \`package.json\` and can typically be run using \`npm install\` followed by a script like \`npm start\` or \`npm run dev\`. If it's a backend in another language (Python, Go, Java), a mobile app, a simple HTML/CSS site without a dev server, or just a library, set this to \`false\`.

    Please format the entire output as a single, valid JSON object. Do not include any text or formatting outside of this JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const parsedText = JSON.parse(response.text);
    return parsedText as AnalysisResult;
  } catch (error) {
    console.error("Error analyzing repository:", error);
    throw new Error("Failed to analyze repository. The model may be unable to access the URL or the format is incorrect.");
  }
};