import { useState, useEffect, useCallback, useRef } from 'react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
  popping: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

const CALM_COLORS = [
  '#A8D8EA', // soft blue
  '#AA96DA', // soft purple
  '#FCBAD3', // soft pink
  '#FFFFD2', // soft yellow
  '#B5EAD7', // soft green
  '#C7CEEA', // soft lavender
  '#FFDAC1', // soft peach
  '#E2F0CB', // soft lime
];

const EMOJIS = ['😊', '🌟', '💫', '🦋', '🌈', '🌸', '⭐', '💖', '🎈', '☁️'];

function playPopSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // Audio not supported, continue silently
  }
}

function App() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [popCount, setPopCount] = useState(0);
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const nextIdRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const createBubble = useCallback((): Bubble => {
    const size = 50 + Math.random() * 60;
    return {
      id: nextIdRef.current++,
      x: Math.random() * (window.innerWidth - size),
      y: window.innerHeight + size,
      size,
      color: CALM_COLORS[Math.floor(Math.random() * CALM_COLORS.length)],
      speed: 0.3 + Math.random() * 0.7,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.02,
      opacity: 0.7 + Math.random() * 0.3,
      popping: false,
    };
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      newParticles.push({
        id: nextIdRef.current++,
        x,
        y,
        color,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 1,
        size: 4 + Math.random() * 6,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const popBubble = useCallback((bubble: Bubble) => {
    if (bubble.popping) return;
    
    if (soundOn) playPopSound();
    
    createParticles(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, bubble.color);
    
    setBubbles(prev => prev.map(b => 
      b.id === bubble.id ? { ...b, popping: true } : b
    ));
    
    setPopCount(prev => {
      const newCount = prev + 1;
      if (newCount % 5 === 0) {
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        setShowEmoji(emoji);
        setTimeout(() => setShowEmoji(null), 1500);
      }
      return newCount;
    });

    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    }, 300);
  }, [soundOn, createParticles]);

  // Game loop
  useEffect(() => {
    if (!gameStarted) return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (delta < 100) { // Skip large deltas (tab switch etc)
        setBubbles(prev => {
          let updated = prev.map(bubble => {
            if (bubble.popping) return bubble;
            return {
              ...bubble,
              y: bubble.y - bubble.speed * (delta / 16),
              wobble: bubble.wobble + bubble.wobbleSpeed * delta,
              x: bubble.x + Math.sin(bubble.wobble) * 0.5,
            };
          });

          // Remove bubbles that went off screen
          updated = updated.filter(b => b.y + b.size > -50 || b.popping);

          return updated;
        });

        // Update particles
        setParticles(prev => 
          prev
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy + 0.1,
              life: p.life - 0.02,
              size: p.size * 0.97,
            }))
            .filter(p => p.life > 0)
        );
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameStarted]);

  // Spawn bubbles
  useEffect(() => {
    if (!gameStarted) return;

    const spawnInterval = setInterval(() => {
      setBubbles(prev => {
        if (prev.filter(b => !b.popping).length < 12) {
          return [...prev, createBubble()];
        }
        return prev;
      });
    }, 1200);

    // Initial bubbles
    const initialBubbles: Bubble[] = [];
    for (let i = 0; i < 5; i++) {
      const b = createBubble();
      b.y = Math.random() * window.innerHeight;
      initialBubbles.push(b);
    }
    setBubbles(initialBubbles);

    return () => clearInterval(spawnInterval);
  }, [gameStarted, createBubble]);

  const handleReset = () => {
    setBubbles([]);
    setParticles([]);
    setPopCount(0);
  };

  // Start screen
  if (!gameStarted) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#E8F4FD] to-[#F0E6FF] select-none">
        <div className="text-center px-6">
          <div className="text-7xl mb-6 animate-bounce">🫧</div>
          <h1 className="text-4xl font-bold text-[#6B7FB5] mb-3">
            Calm Bubbles
          </h1>
          <p className="text-lg text-[#8B9DC3] mb-8">
            Tap the bubbles to pop them!
          </p>
          <button
            onClick={() => setGameStarted(true)}
            className="px-10 py-4 bg-[#A8D8EA] text-white text-xl font-semibold rounded-full shadow-lg active:scale-95 transition-transform duration-150 hover:bg-[#8EC8DE]"
          >
            ▶ Play
          </button>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-2xl">🌸</span>
            <span className="text-2xl">🦋</span>
            <span className="text-2xl">⭐</span>
            <span className="text-2xl">🌈</span>
            <span className="text-2xl">💫</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F5EEFF] to-[#FFF0F5] select-none touch-none">
      {/* Bubbles */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          onClick={() => popBubble(bubble)}
          onTouchStart={(e) => {
            e.preventDefault();
            popBubble(bubble);
          }}
          className={`absolute rounded-full cursor-pointer transition-transform duration-150 ${
            bubble.popping ? 'scale-150 opacity-0' : 'hover:scale-105'
          }`}
          style={{
            left: bubble.x,
            top: bubble.y,
            width: bubble.size,
            height: bubble.size,
            backgroundColor: bubble.color,
            opacity: bubble.popping ? 0 : bubble.opacity,
            boxShadow: `inset -8px -8px 20px rgba(255,255,255,0.6), 
                        inset 4px 4px 10px rgba(0,0,0,0.05),
                        0 4px 15px rgba(0,0,0,0.1)`,
            transition: bubble.popping 
              ? 'transform 0.3s ease-out, opacity 0.3s ease-out' 
              : 'transform 0.15s ease',
          }}
        >
          {/* Shine effect */}
          <div
            className="absolute rounded-full bg-white"
            style={{
              width: '30%',
              height: '30%',
              top: '15%',
              left: '20%',
              opacity: 0.6,
              filter: 'blur(2px)',
            }}
          />
        </div>
      ))}

      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.life,
            transform: `scale(${particle.life})`,
          }}
        />
      ))}

      {/* Celebration emoji */}
      {showEmoji && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="text-8xl animate-ping">{showEmoji}</div>
        </div>
      )}

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-40">
        {/* Pop counter */}
        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
          <span className="text-xl">🫧</span>
          <span className="text-lg font-semibold text-[#6B7FB5]">{popCount}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="w-10 h-10 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-full shadow-sm active:scale-90 transition-transform"
          >
            <span className="text-xl">{soundOn ? '🔊' : '🔇'}</span>
          </button>
          <button
            onClick={handleReset}
            className="w-10 h-10 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-full shadow-sm active:scale-90 transition-transform"
          >
            <span className="text-xl">🔄</span>
          </button>
        </div>
      </div>

      {/* Gentle encouragement text */}
      {popCount > 0 && popCount % 10 === 0 && (
        <div className="fixed bottom-20 left-0 right-0 text-center pointer-events-none z-30">
          <p className="text-2xl text-[#8B9DC3] font-medium animate-pulse">
            {popCount >= 30 ? '🌟 Amazing! 🌟' : 
             popCount >= 20 ? '✨ Great job! ✨' : 
             '😊 Well done! 😊'}
          </p>
        </div>
      )}

      {/* Bottom hint */}
      <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none z-30">
        <p className="text-sm text-[#B0B8D4]">
          {bubbles.filter(b => !b.popping).length === 0 
            ? 'New bubbles coming soon... 🫧' 
            : 'Tap a bubble! 👆'}
        </p>
      </div>
    </div>
  );
}

export default App;
