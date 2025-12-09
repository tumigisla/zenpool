import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative px-6 py-12 overflow-y-auto">
      <div className="vignette" />
      
      <div className="z-10 flex flex-col items-center gap-8 max-w-2xl animate-fade-in">
        {/* Header */}
        <Link to="/">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-white/90 hover:text-white transition-colors">
            ZENPOOL
          </h1>
        </Link>

        {/* OG Image */}
        <div className="w-full max-w-lg rounded-lg overflow-hidden border border-white/10 shadow-2xl">
          <img 
            src="/og-image.png" 
            alt="ZenPool - Listen to Bitcoin" 
            className="w-full h-auto"
          />
        </div>

        {/* Description */}
        <div className="text-center space-y-6">
          <h2 className="text-xl sm:text-2xl text-white/80 font-light tracking-wide">
            Listen to Bitcoin
          </h2>
          
          <p className="text-white/50 leading-relaxed">
            ZenPool transforms the Bitcoin mempool into a meditative soundscape. 
            Every transaction becomes a gentle note, every block a resonant singing bowl.
          </p>
          
          <p className="text-white/40 leading-relaxed text-sm">
            Experience the rhythm of the blockchain in real-time. The ambient sounds 
            shift with network activity - calm during quiet periods, more active as 
            the mempool fills. Large transactions create deeper tones, while small 
            ones add delicate high notes to the composition.
          </p>

          <div className="pt-4 space-y-3">
            <h3 className="text-white/60 text-sm uppercase tracking-widest">How it works</h3>
            <ul className="text-white/40 text-sm space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-start gap-3">
                <span className="text-amber-400/60">•</span>
                <span>Real-time WebSocket connection to the Bitcoin mempool</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-400/60">•</span>
                <span>Transaction values mapped to musical frequencies</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-400/60">•</span>
                <span>Network congestion influences ambient drone intensity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-400/60">•</span>
                <span>New blocks trigger tibetan singing bowl sounds</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link 
            to="/app"
            className="px-8 py-3 bg-transparent border border-amber-400/40 hover:border-amber-400/80 
                       rounded-full text-amber-400/80 hover:text-amber-400
                       transition-all duration-500 tracking-widest uppercase text-sm"
          >
            Enter ZenPool
          </Link>
          
          <a 
            href="https://github.com/tumigisla/zenpool"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-transparent border border-white/20 hover:border-white/40 
                       rounded-full text-white/50 hover:text-white/70
                       transition-all duration-500 tracking-widest uppercase text-sm
                       flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
        </div>

        {/* Back Link */}
        <Link 
          to="/"
          className="text-xs text-white/30 hover:text-white/50 transition-colors duration-300 tracking-wider mt-4"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
