import { Link } from 'react-router-dom';
import { useMempoolSocket } from '../hooks/useMempoolSocket';

export function LandingPage() {
  const { networkState } = useMempoolSocket();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative px-6">
      <div className="vignette" />
      
      <div className="z-10 flex flex-col items-center gap-6 sm:gap-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-display text-4xl sm:text-6xl md:text-8xl font-extralight tracking-[0.2em] sm:tracking-[0.4em] text-white/90">
            ZENPOOL
          </h1>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2.5 mt-2">
          <div 
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              networkState.isConnected 
                ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                : 'bg-red-400 animate-pulse'
            }`} 
          />
          <span className="text-xs sm:text-sm text-white/50 font-light tracking-widest uppercase">
            {networkState.isConnected ? 'Live' : 'Connecting'}
          </span>
        </div>

        {/* Enter Button */}
        <Link 
          to="/app"
          className={`group relative mt-6 sm:mt-8 px-12 sm:px-16 py-4 sm:py-5 bg-transparent
                     border border-white/20 hover:border-amber-400/60 
                     rounded-full text-white/70 hover:text-white
                     transition-all duration-700 tracking-[0.15em] sm:tracking-[0.2em] uppercase text-sm font-light
                     hover:shadow-2xl hover:shadow-amber-400/20
                     ${!networkState.isConnected ? 'opacity-30 pointer-events-none' : ''}`}
        >
          <span className="relative z-10">Begin</span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </Link>

        <p className="text-xs sm:text-sm text-white/30 mt-6 sm:mt-8 font-light tracking-wide">
          Listen to Bitcoin
        </p>
      </div>

      {/* Bottom Links */}
      <div className="absolute bottom-6 sm:bottom-8 flex flex-col items-center gap-3">
        <Link 
          to="/about"
          className="text-xs text-white/30 hover:text-white/50 transition-colors duration-300 tracking-wider"
        >
          What is this?
        </Link>
        <a 
          href="https://github.com/tumigisla/zenpool"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/20 hover:text-white/50 transition-colors duration-300"
          title="View on GitHub"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
