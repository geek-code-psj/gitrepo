import React, { useState } from 'react';
import InputForm from './components/InputForm';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';
import { analyzeRepo } from './services/geminiService';
import { AnalysisResult } from './types';
import FileCodeIcon from './components/icons/FileCodeIcon';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [repoUrl, setRepoUrl] = useState('');

  const handleAnalyze = async (url: string) => {
    // A more robust regex that handles optional protocols, www, .git suffix, and trailing slashes.
    const githubUrlRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+(\.git)?\/?$/;
    if (!githubUrlRegex.test(url)) {
      setError("Please enter a valid GitHub repository URL. (e.g., https://github.com/owner/repo)");
      return;
    }
    
    // Clean the URL for consistency before using it.
    const cleanedUrl = url.trim().replace(/\/$/, '').replace(/\.git$/, '');

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setRepoUrl(cleanedUrl);

    try {
      const result = await analyzeRepo(cleanedUrl);
      setAnalysisResult(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <main className="w-full flex flex-col items-center justify-center flex-grow space-y-8">
        {!analysisResult && (
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-4">
                 <FileCodeIcon className="w-12 h-12 text-indigo-400" />
                 <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
                    Repo Ready
                 </h1>
              </div>
              <p className="max-w-2xl text-lg sm:text-xl text-gray-400">
                Enter a public GitHub URL to generate setup instructions and prepare a downloadable package.
              </p>
            </div>
        )}

        <div className="w-full flex justify-center">
            {!analysisResult && <InputForm onSubmit={handleAnalyze} isLoading={isLoading} />}
        </div>
        
        {isLoading && <Loader text="Preparing Repo..."/>}

        {error && !isLoading && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg max-w-2xl w-full text-center" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        
        {analysisResult && !isLoading && (
          <ResultsDisplay result={analysisResult} repoUrl={repoUrl} />
        )}
      </main>

      <footer className="text-center text-gray-500 py-4 mt-auto">
        <p>Powered by Gemini API</p>
      </footer>
    </div>
  );
};

export default App;
