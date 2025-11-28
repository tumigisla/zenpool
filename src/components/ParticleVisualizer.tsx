import { useRef, useEffect, useCallback } from 'react';
import type { Transaction } from '../types/mempool';

/**
 * ParticleVisualizer - Canvas-based visualization of Bitcoin transactions
 * 
 * Particles fall like sand/embers and accumulate in a "candidate block" container.
 * When a block is mined, particles crystallize and dissolve.
 */

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  settled: boolean;
  value: number;
  feeRate: number;
}

interface ParticleVisualizerProps {
  transactions: Transaction[];
  stressLevel: number;
  isBlockEvent: boolean;
  onBlockEventComplete?: () => void;
  highlightedTxId?: string | null;
}

// Fee rate to color mapping
const getFeeColor = (feeRate: number): string => {
  if (feeRate < 5) return '#3B82F6';      // Blue - low priority
  if (feeRate < 15) return '#14B8A6';     // Teal
  if (feeRate < 30) return '#22C55E';     // Green
  if (feeRate < 50) return '#EAB308';     // Yellow
  if (feeRate < 100) return '#F97316';    // Orange
  return '#EF4444';                        // Red - high priority
};

// Transaction value to particle size
const getParticleSize = (value: number): number => {
  const btc = value / 100_000_000;
  if (btc >= 10) return 12;
  if (btc >= 1) return 8;
  if (btc >= 0.1) return 5;
  if (btc >= 0.01) return 3;
  return 2;
};

const MAX_PARTICLES = 300;
const GRAVITY = 0.15;
const CONTAINER_PADDING = 40;
const MAX_FILL_RATIO = 0.85; // Maximum fill percentage before removing old particles

export function ParticleVisualizer({ 
  transactions, 
  stressLevel, 
  isBlockEvent,
  highlightedTxId,
}: ParticleVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const processedTxsRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>(0);
  const blockEventRef = useRef(false);
  const blockAnimationProgress = useRef(0);
  const highlightedTxIdRef = useRef<string | null>(null);
  const highlightAnimationRef = useRef(0);

  // Container dimensions (relative to canvas)
  const containerRef = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    bottom: 0,
  });

  // Spawn a new particle for a transaction
  const spawnParticle = useCallback((tx: Transaction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = containerRef.current;
    
    // Random spawn position at top within container width
    const x = container.x + Math.random() * container.width;
    const y = container.y - 20;

    const particle: Particle = {
      id: tx.txid,
      x,
      y,
      vx: (Math.random() - 0.5) * 1,
      vy: Math.random() * 2 + 1,
      size: getParticleSize(tx.value),
      color: getFeeColor(tx.feeRate),
      alpha: 0.8,
      settled: false,
      value: tx.value,
      feeRate: tx.feeRate,
    };

    particlesRef.current.push(particle);

    // Limit particles
    if (particlesRef.current.length > MAX_PARTICLES) {
      // Remove oldest settled particles first
      const settled = particlesRef.current.filter(p => p.settled);
      if (settled.length > 0) {
        const toRemove = settled[0];
        particlesRef.current = particlesRef.current.filter(p => p.id !== toRemove.id);
      } else {
        particlesRef.current.shift();
      }
    }
  }, []);

  // Process new transactions
  useEffect(() => {
    for (const tx of transactions) {
      if (!processedTxsRef.current.has(tx.txid)) {
        processedTxsRef.current.add(tx.txid);
        spawnParticle(tx);
      }
    }

    // Cleanup old txids
    if (processedTxsRef.current.size > 1000) {
      const arr = Array.from(processedTxsRef.current);
      processedTxsRef.current = new Set(arr.slice(-500));
    }
  }, [transactions, spawnParticle]);

  // Handle block event
  useEffect(() => {
    if (isBlockEvent && !blockEventRef.current) {
      blockEventRef.current = true;
      blockAnimationProgress.current = 0;
    }
  }, [isBlockEvent]);

  // Handle highlighted transaction
  useEffect(() => {
    if (highlightedTxId) {
      highlightedTxIdRef.current = highlightedTxId;
      highlightAnimationRef.current = 0;
    } else {
      highlightedTxIdRef.current = null;
    }
  }, [highlightedTxId]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Update container dimensions
      const padding = CONTAINER_PADDING;
      containerRef.current = {
        x: padding,
        y: padding,
        width: rect.width - padding * 2,
        height: rect.height - padding * 2,
        bottom: rect.height - padding,
      };
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const container = containerRef.current;
      const particles = particlesRef.current;

      // Draw container outline
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + stressLevel * 0.1})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(container.x, container.y, container.width, container.height);

      // Block event animation
      if (blockEventRef.current) {
        blockAnimationProgress.current += 0.02;

        if (blockAnimationProgress.current < 1) {
          // Phase 1: Particles converge to center
          const centerX = container.x + container.width / 2;
          const centerY = container.y + container.height / 2;
          const progress = blockAnimationProgress.current;

          for (const p of particles) {
            p.x += (centerX - p.x) * 0.1 * progress;
            p.y += (centerY - p.y) * 0.1 * progress;
            p.alpha = Math.max(0, p.alpha - 0.02);
          }

          // Draw crystallization glow
          const glowRadius = 50 + progress * 100;
          const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, glowRadius
          );
          gradient.addColorStop(0, `rgba(251, 191, 36, ${0.5 * (1 - progress)})`);
          gradient.addColorStop(0.5, `rgba(251, 191, 36, ${0.2 * (1 - progress)})`);
          gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
          ctx.fill();

        } else if (blockAnimationProgress.current < 2) {
          // Phase 2: Clear all particles
          const fadeProgress = blockAnimationProgress.current - 1;
          for (const p of particles) {
            p.alpha = Math.max(0, 1 - fadeProgress);
          }

        } else {
          // Animation complete - reset
          blockEventRef.current = false;
          blockAnimationProgress.current = 0;
          particlesRef.current = [];
        }
      } else {
        // Normal physics update
        for (const p of particles) {
          if (p.settled) continue;

          // Apply gravity
          p.vy += GRAVITY;

          // Apply slight horizontal drift based on stress
          p.vx += (Math.random() - 0.5) * 0.1 * stressLevel;

          // Update position
          p.x += p.vx;
          p.y += p.vy;

          // Bounce off container walls
          if (p.x < container.x + p.size) {
            p.x = container.x + p.size;
            p.vx *= -0.5;
          }
          if (p.x > container.x + container.width - p.size) {
            p.x = container.x + container.width - p.size;
            p.vx *= -0.5;
          }

          // Settle at bottom or on other particles
          const settleY = findSettleY(p, particles, container);
          if (p.y >= settleY - p.size) {
            p.y = settleY - p.size;
            p.vy = 0;
            p.vx *= 0.8;
            if (Math.abs(p.vx) < 0.1) {
              p.settled = true;
            }
          }

          // Dampen velocity
          p.vx *= 0.99;
          p.vy *= 0.99;
        }

        // Prune overflowing particles
        pruneOverflowingParticles(particles, container);
      }

      // Draw particles
      for (const p of particles) {
        if (p.alpha <= 0) continue;

        // Check if this particle is highlighted
        const isHighlighted = highlightedTxIdRef.current === p.id;
        
        if (isHighlighted) {
          // Update highlight animation
          highlightAnimationRef.current += 0.08;
          const pulse = Math.sin(highlightAnimationRef.current) * 0.3 + 0.7;
          const ringExpand = Math.min(highlightAnimationRef.current * 0.5, 2);
          
          // Draw expanding ring
          const ringRadius = p.size * (2 + ringExpand);
          ctx.beginPath();
          ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.4})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw outer glow
          const glowGradient = ctx.createRadialGradient(
            p.x, p.y, p.size,
            p.x, p.y, ringRadius * 1.5
          );
          glowGradient.addColorStop(0, `rgba(255, 255, 255, ${pulse * 0.15})`);
          glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, ringRadius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size * 2
        );
        gradient.addColorStop(0, p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.5, p.color + Math.round(p.alpha * 128).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, p.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // Draw stress indicator at top
      const stressWidth = container.width * stressLevel;
      const stressGradient = ctx.createLinearGradient(
        container.x, 0,
        container.x + container.width, 0
      );
      stressGradient.addColorStop(0, 'rgba(52, 211, 153, 0.3)');
      stressGradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.3)');
      stressGradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
      ctx.fillStyle = stressGradient;
      ctx.fillRect(container.x, container.y, stressWidth, 2);

      animationRef.current = requestAnimationFrame(animate);
    };

    // Find the Y position where a particle should settle
    const findSettleY = (p: Particle, particles: Particle[], container: { bottom: number; x: number; width: number; y: number; height: number }) => {
      let settleY = container.bottom;

      for (const other of particles) {
        if (other.id === p.id || !other.settled) continue;
        
        // Check if horizontally overlapping
        const dx = Math.abs(p.x - other.x);
        if (dx < p.size + other.size) {
          // Can settle on top of this particle
          const topOfOther = other.y - other.size;
          if (topOfOther < settleY) {
            settleY = topOfOther;
          }
        }
      }

      // Clamp to container top - prevent overflow
      const minY = container.y + p.size * 2;
      if (settleY < minY) {
        settleY = minY;
      }

      return settleY;
    };

    // Remove oldest settled particles when pool is too full
    const pruneOverflowingParticles = (particles: Particle[], container: { y: number; bottom: number; height: number }) => {
      const settledParticles = particles.filter(p => p.settled);
      if (settledParticles.length === 0) return;

      // Find the highest settled particle
      let highestY = container.bottom;
      for (const p of settledParticles) {
        if (p.y - p.size < highestY) {
          highestY = p.y - p.size;
        }
      }

      // Calculate fill level
      const fillHeight = container.bottom - highestY;
      const maxFillHeight = container.height * MAX_FILL_RATIO;

      // If overflowing, remove oldest settled particles
      if (fillHeight > maxFillHeight) {
        // Sort settled particles by y position (highest first = oldest at bottom)
        const sortedSettled = [...settledParticles].sort((a, b) => b.y - a.y);
        
        // Remove the bottom-most (oldest) particles until we're under the limit
        const toRemove = Math.ceil(sortedSettled.length * 0.15); // Remove 15% of settled
        const idsToRemove = new Set(sortedSettled.slice(0, toRemove).map(p => p.id));
        
        // Fade out and remove
        for (const p of particles) {
          if (idsToRemove.has(p.id)) {
            p.alpha -= 0.1;
          }
        }
        
        // Actually remove fully faded particles
        particlesRef.current = particles.filter(p => p.alpha > 0);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [stressLevel]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ 
        background: 'transparent',
        mixBlendMode: 'screen',
      }}
    />
  );
}

