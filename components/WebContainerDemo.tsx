import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree } from '@webcontainer/api';
import PlayIcon from './icons/PlayIcon';
import RocketLaunchIcon from './icons/RocketLaunchIcon';
import GithubIcon from './icons/GithubIcon';


declare const JSZip: any;

const TIMEOUT_DURATION = 120000; // 120 seconds

const getRepoInfo = (repoUrl: string) => {
    try {
        const cleanedUrl = repoUrl.trim().replace(/\/$/, '').replace(/\.git$/, '');
        const path = new URL(cleanedUrl).pathname.substring(1);
        const [owner, repoName] = path.split('/');
        if (!owner || !repoName) throw new Error("Invalid path");
        return { owner, repoName, path: `${owner}/${repoName}` };
    } catch {
        return { owner: 'unknown', repoName: 'repo', path: 'unknown/repo' };
    }
};

const fetchAndUnzipRepo = async (repoUrl: string): Promise<FileSystemTree> => {
    const { owner, repoName } = getRepoInfo(repoUrl);
    const zipUrl = `https://github.com/${owner}/${repoName}/archive/HEAD.zip`;
    
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(zipUrl)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch repository: ${response.statusText}`);
    }
    const blob = await response.blob();
    const zip = await JSZip.loadAsync(blob);
    
    const rootFolder = Object.keys(zip.files)[0];
    if (!rootFolder) {
        throw new Error("Zip file is empty or invalid.");
    }
    
    const fileSystemTree: FileSystemTree = {};

    for (const rawPath in zip.files) {
        const zipObject = zip.files[rawPath];
        if (zipObject.dir) continue;

        const path = rawPath.substring(rootFolder.length);
        if (!path) continue;

        const content = await zipObject.async('uint8array');
        const pathParts = path.split('/').filter(Boolean);
        let currentLevel: any = fileSystemTree;

        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!currentLevel[part]) {
                currentLevel[part] = { directory: {} };
            }
            currentLevel = currentLevel[part].directory;
        }
        currentLevel[pathParts[pathParts.length - 1]] = {
            file: { contents: content },
        };
    }
    return fileSystemTree;
};


const WebContainerDemo: React.FC<{ repoUrl: string }> = ({ repoUrl }) => {
    const webcontainerRef = useRef<WebContainer | null>(null);
    const terminalRef = useRef<HTMLPreElement | null>(null);
    const [status, setStatus] = useState<'idle' | 'booting_fetching' | 'mounting' | 'installing' | 'starting' | 'ready' | 'error' | 'timed_out'>('idle');
    const [progress, setProgress] = useState(0);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const startDevServer = useCallback(async () => {
        const setupPromise = (async () => {
            if (webcontainerRef.current) return;
            
            setStatus('booting_fetching');
            setProgress(5);
            setLogs(['▶ Booting WebContainer and fetching repository files...']);

            const [wc, files] = await Promise.all([
                WebContainer.boot(),
                fetchAndUnzipRepo(repoUrl)
            ]);
            
            webcontainerRef.current = wc;

            wc.on('error', (err) => {
                console.error(err);
                setError(`WebContainer error: ${err.message}`);
                setStatus('error');
            });
            
            setStatus('mounting');
            setProgress(30);
            setLogs(prev => [...prev, '▶ Mounting file system...']);
            await wc.mount(files);

            // Detect package manager
            let packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
            if (files['pnpm-lock.yaml']) {
                packageManager = 'pnpm';
            } else if (files['yarn.lock']) {
                packageManager = 'yarn';
            }
            setLogs(prev => [...prev, `▶ Detected ${packageManager} lock file. Using ${packageManager}.\n`]);


            setStatus('installing');
            setProgress(40);
            setLogs(prev => [...prev, `▶ Running "${packageManager} install"... (this might take a while)\n`]);
            
            const installProcess = await wc.spawn(packageManager, ['install']);
            installProcess.output.pipeTo(new WritableStream({
                write(data) {
                    setLogs(prev => [...prev, data]);
                }
            }));
            const installExitCode = await installProcess.exit;
            if (installExitCode !== 0) {
                throw new Error(`"${packageManager} install" failed with exit code ${installExitCode}`);
            }

            setProgress(85);
            setStatus('starting');
            setLogs(prev => [...prev, `\n▶ Running "${packageManager} run dev" or "${packageManager} start"...\n`]);
            
            let startProcess;
            try {
                // Try 'dev' script first
                startProcess = await wc.spawn(packageManager, ['run', 'dev']);
            } catch (e) {
                 setLogs(prev => [...prev, 'Could not find "dev" script, trying "start" script...\n']);
                 // If 'dev' fails, try 'start' script
                 startProcess = await wc.spawn(packageManager, ['start']);
            }

            startProcess.output.pipeTo(new WritableStream({
                write(data) {
                    setLogs(prev => [...prev, data]);
                }
            }));

            wc.on('server-ready', (port, url) => {
                setLogs(prev => [...prev, `\n✅ Server ready at ${url}`]);
                setIframeUrl(url);
                setProgress(100);
                setStatus('ready');
            });

        })();

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), TIMEOUT_DURATION)
        );

        try {
            await Promise.race([setupPromise, timeoutPromise]);
        } catch(err: any) {
            console.error(err);
            if (err.message === "Timeout") {
                setError('The setup process took too long. Please try a cloud IDE for a more robust environment.');
                setStatus('timed_out');
            } else {
                setError(err.message || 'An unknown error occurred.');
                setStatus('error');
            }
            webcontainerRef.current?.teardown();
        }
    }, [repoUrl]);

    useEffect(() => {
        return () => {
            webcontainerRef.current?.teardown();
        };
    }, []);
    
    const CloudIdeLinks = () => {
        const { owner, repoName } = getRepoInfo(repoUrl);
        const stackblitzUrl = `https://stackblitz.com/github/${owner}/${repoName}`;
        const replitUrl = `https://replit.com/github/${owner}/${repoName}`;
        
        return (
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
        );
    };

    const LoadingStateDisplay = () => {
        const statusMap = {
            booting_fetching: 'Initializing container & fetching files...',
            mounting: 'Mounting file system...',
            installing: 'Installing dependencies...',
            starting: 'Starting dev server...',
        };
        const currentStatusText = statusMap[status as keyof typeof statusMap] || 'Preparing environment...';

        return (
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 w-full text-center">
                 <p className="text-sm text-white mb-2 font-medium">{currentStatusText}</p>
                 <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                    <div 
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ 
                            width: `${progress}%`,
                            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)',
                            backgroundSize: '1rem 1rem',
                            animation: 'progress-bar-stripes 1s linear infinite'
                        }}
                    ></div>
                </div>
                <p className="text-xs text-gray-400">First-time setup can take up to two minutes.</p>
            </div>
        );
    };


    const renderContent = () => {
        if (status === 'ready' && iframeUrl) {
            return <iframe src={iframeUrl} className="w-full h-96 rounded-b-lg border-t-2 border-indigo-500" title="Live Demo" />;
        }
        
        const isLoading = status !== 'idle' && status !== 'error' && status !== 'timed_out';
        
        if (isLoading) {
             return <LoadingStateDisplay />;
        }
        
        if (status === 'error' || status === 'timed_out') {
            return (
                 <div className="w-full space-y-4">
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                    <CloudIdeLinks />
                </div>
            )
        }

        return (
            <button
                onClick={startDevServer}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 text-lg mt-auto"
            >
                <PlayIcon className="w-5 h-5" /> Run In-Browser Demo
            </button>
        );
    }
    
    return (
        <>
            <style>
                {`
                    @keyframes progress-bar-stripes {
                        from { background-position: 1rem 0; }
                        to { background-position: 0 0; }
                    }
                `}
            </style>
            <PlayIcon className="w-10 h-10 text-teal-400 mb-4 mx-auto" />
            <h3 className="font-semibold text-white text-xl mb-2">In-Browser Demo</h3>
            <p className="text-sm text-gray-400 mb-6 flex-grow">
                Run this project instantly in a secure, browser-based environment powered by WebContainers.
            </p>
            <div className="w-full mt-auto space-y-4">
                {renderContent()}
                
                {(status !== 'idle' && status !== 'ready') && (
                    <div className="w-full h-48 bg-black/50 rounded-lg p-2 border border-gray-700">
                        <pre ref={terminalRef} className="w-full h-full overflow-y-auto text-xs text-left whitespace-pre-wrap font-mono text-gray-400">
                           {logs.join('')}
                        </pre>
                    </div>
                )}
            </div>
        </>
    );
};

export default WebContainerDemo;