import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import GithubIcon from './icons/GithubIcon';
import RocketLaunchIcon from './icons/RocketLaunchIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import WebContainerDemo from './WebContainerDemo';

interface ResultsDisplayProps {
  result: AnalysisResult;
  repoUrl: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, repoUrl }) => {
  const [copied, setCopied] = useState(false);

  const getRepoInfo = () => {
    try {
        const cleanedUrl = repoUrl.trim().replace(/\/$/, '').replace(/\.git$/, '');
        const path = new URL(cleanedUrl).pathname.substring(1);
        const [owner, repoName] = path.split('/');
        if (!owner || !repoName) throw new Error("Invalid path");
        return { owner, repoName, path: `${owner}/${repoName}` };
    } catch {
        return { owner: 'unknown', repoName: 'repo', path: 'unknown/repo'};
    }
  };

  const { owner, repoName, path } = getRepoInfo();
  const stackblitzUrl = `https://stackblitz.com/github/${owner}/${repoName}`;
  const replitUrl = `https://replit.com/github/${owner}/${repoName}`;
  const repoZipUrl = `https://github.com/${owner}/${repoName}/archive/HEAD.zip`;
  const preparedFilename = `${repoName}-main.zip`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(result.setupInstructions).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy instructions. Please copy them manually.');
    });
  };

  return (
    <div className="w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      <div className="p-6 bg-gray-900/50 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-center truncate" title={repoUrl}>{path}</h2>
        <p className="text-center text-gray-400 mt-1">Your repository is ready for setup.</p>
      </div>

      <div className="p-6 grid md:grid-cols-2 gap-6">
        {/* Instructions & Download Section */}
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col">
            <BookOpenIcon className="w-10 h-10 text-indigo-400 mb-4 mx-auto" />
            <h3 className="font-semibold text-white text-xl mb-2 text-center">Setup Instructions & Download</h3>
            
            <div className="relative bg-gray-900 p-4 rounded-md border border-gray-700 mb-4">
                <button 
                    onClick={handleCopyToClipboard}
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-2 rounded-md text-xs transition-colors"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 overflow-x-auto">
                    <code>{result.setupInstructions}</code>
                </pre>
            </div>
            
            <p className="text-sm text-gray-400 mb-6 text-center flex-grow">
                Download the original repository zip file and follow the instructions above to get started.
            </p>
            <a
                href={repoZipUrl}
                download={preparedFilename}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 text-lg mt-auto"
            >
                <DownloadIcon className="w-5 h-5"/> Download Repo (.zip)
            </a>
        </div>

        {/* In-Browser Demo or Cloud IDE Section */}
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col text-center">
             {result.isNodeProject ? (
                <WebContainerDemo repoUrl={repoUrl} />
            ) : (
                <>
                    <RocketLaunchIcon className="w-10 h-10 text-teal-400 mb-4 mx-auto" />
                    <h3 className="font-semibold text-white text-xl mb-2">Launch in a Cloud IDE</h3>
                    <p className="text-sm text-gray-400 mb-6 flex-grow">
                        This project type is not supported for an in-browser demo. You can run it instantly in a full-featured, browser-based development environment using one of these services.
                    </p>
                    <div className="space-y-3 mt-auto">
                         <a href={stackblitzUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300">
                            <RocketLaunchIcon className="w-4 h-4" /> Open in StackBlitz
                        </a>
                         <a href={replitUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300">
                            <RocketLaunchIcon className="w-4 h-4" /> Open in Replit
                        </a>
                        <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300">
                            <GithubIcon className="w-4 h-4" /> View on GitHub
                        </a>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;