import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="w-full h-full flex flex-col items-center relative px-6 py-12 overflow-y-auto">
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
