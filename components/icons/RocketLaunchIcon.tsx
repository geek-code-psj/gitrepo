import React from 'react';

const RocketLaunchIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.58 2.25a2.25 2.25 0 0 0-2.25 2.25L12 12l-2.25-2.25a2.25 2.25 0 0 0-2.25-2.25L2.25 9.75l9.75 9.75 2.25-5.25 5.25-5.25-5.25-2.25Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.58 2.25 6.172 6.172" />
  </svg>
);

export default RocketLaunchIcon;