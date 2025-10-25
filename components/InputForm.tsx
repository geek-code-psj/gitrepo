import React, { useState } from 'react';
import GithubIcon from './icons/GithubIcon';

interface InputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex items-center bg-gray-800 border-2 border-gray-700 rounded-full shadow-lg overflow-hidden">
        <div className="pl-5 pr-3">
          <GithubIcon className="w-6 h-6 text-gray-400" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/facebook/react"
          className="w-full bg-gray-800 text-white placeholder-gray-500 focus:outline-none py-4 text-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !url}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-4 px-6 transition-colors duration-300 text-lg whitespace-nowrap"
        >
          {isLoading ? 'Preparing...' : 'Prepare for Setup'}
        </button>
      </div>
    </form>
  );
};

export default InputForm;
