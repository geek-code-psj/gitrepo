import React from 'react';

const Loader: React.FC<{text?: string}> = ({ text = "Analyzing..." }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400"></div>
      <p className="text-indigo-300 text-lg font-semibold">{text}</p>
    </div>
  );
};

export default Loader;
