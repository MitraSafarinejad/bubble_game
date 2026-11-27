import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
  kind: 'normal' | 'gold' | 'time' | 'burst';
  keySlot: number;
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

type Screen = 'start' | 'playing' | 'paused' | 'result';
type Mode = 'calm' | 'classic' | 'rush';

const MODE_CONFIG = {
  calm: { label: 'Calm', duration: 45, spawn: 1100, speed: 0.65, max: 10 },
  classic: { label: 'Classic', duration: 60, spawn: 850, speed: 1, max: 14 },
  rush: { label: 'Rush', duration: 30, spawn: 520, speed: 1.45, max: 18 },
} as const;

const COLORS = ['#70B7FF', '#9B7CF4', '#FF85A6', '#FFB86B', '#5DD6B4', '#70D9E8', '#D98FF7'];

function BubbleGame() {
  const [screen, setScreen] = useState<Screen>('start');
  const [mode, setMode] = useState<Mode>('classic');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [score, setScore] = useState(0);
  const [popped, setPopped] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(MODE_CONFIG.classic.duration);
  const [soundOn, setSoundOn] = useState(true);
  const [showCombo, setShowCombo] = useState(false);
  const [best, setBest] = useState(() => Number(localStorage.getItem('bubble-best') || 0));
  const nextId = useRef(1);
  const frameRef = useRef(0);
  const lastFrame = useRef(0);
  const comboTimer = useRef<number>(0);

  const playSound = useCallback((frequency = 520) => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, context.currentTime + 0.12);
      gain.gain.setValueAtTime(0.09, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.14);
    } catch {
      // Sound is optional and should not disrupt the game
    }
  }, [soundOn]);

  const createBubble = useCallback((randomKind = true, keySlot = 0): Bubble => {
    const size = 48 + Math.random() * 58;
    const roll = randomKind ? Math.random() : 1;
    const kind: Bubble['kind'] = roll > 0.94 ? 'time' : roll > 0.88 ? 'burst' : roll > 0.82 ? 'gold' : 'normal';
    const kindColors: Record<Bubble['kind'], string> = {
      normal: COLORS[Math.floor(Math.random() * COLORS.length)],
      gold: '#FFD166',
      time: '#62DDB3',
      burst: '#FF7F9F',
    };
    return {
      id: nextId.current++,
      x: 24 + Math.random() * Math.max(1, window.innerWidth - size - 48),
      y: window.innerHeight + size,
      size,
      color: kindColors[kind],
      speed: (0.35 + Math.random() * 0.55) * MODE_CONFIG[mode].speed,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.012 + Math.random() * 0.018,
      kind,
      keySlot,
      popping: false,
    };
  }, [mode]);

  const createParticles = useCallback((bubble: Bubble) => {
    const count = bubble.kind === 'burst' ? 14 : 9;
    const particlesToAdd: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const force = 1.8 + Math.random() * 3;
      particlesToAdd.push({
        id: nextId.current++,
        x: bubble.x + bubble.size / 2,
        y: bubble.y + bubble.size / 2,
        color: bubble.color,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        life: 1,
        size: 4 + Math.random() * 7,
      });
    }
    setParticles(previous => [...previous, ...particlesToAdd]);
  }, []);

  const endGame = useCallback(() => {
    setScreen('result');
    setBubbles([]);
  }, []);

  const startGame = useCallback(() => {
    const config = MODE_CONFIG[mode];
    setScreen('playing');
    setScore(0);
    setPopped(0);
    setCombo(0);
    setTimeLeft(config.duration);
    setParticles([]);
    const initial = Array.from({ length: 6 }, (_, index) => {
      const bubble = createBubble(true, index + 1);
      bubble.y = 120 + Math.random() * Math.max(140, window.innerHeight - 300);
      return bubble;
    });
    setBubbles(initial);
  }, [createBubble, mode]);

  useEffect(() => {
    if (screen !== 'playing') return;
    const timer = window.setInterval(() => {
      setTimeLeft(current => {
        if (current <= 1) {
          window.clearInterval(timer);
          window.setTimeout(endGame, 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, endGame]);

  useEffect(() => {
    if (screen !== 'playing') return;
    const config = MODE_CONFIG[mode];
    const spawn = window.setInterval(() => {
      setBubbles(previous => {
        const active = previous.filter(bubble => !bubble.popping);
        if (active.length >= config.max) return previous;
        const usedSlots = new Set(active.map(bubble => bubble.keySlot));
        let keySlot = 1;
        while (usedSlots.has(keySlot) && keySlot < 9) keySlot++;
        return [...previous, createBubble(true, keySlot <= 9 ? keySlot : 0)];
      });
    }, config.spawn);
    return () => window.clearInterval(spawn);
  }, [screen, mode, createBubble]);

  useEffect(() => {
    if (screen !== 'playing') return;
    lastFrame.current = 0;
    const loop = (timestamp: number) => {
      if (!lastFrame.current) lastFrame.current = timestamp;
      const delta = Math.min(timestamp - lastFrame.current, 32);
      lastFrame.current = timestamp;
      setBubbles(previous => previous
        .map(bubble => bubble.popping ? bubble : {
          ...bubble,
          y: bubble.y - bubble.speed * (delta / 16),
          wobble: bubble.wobble + bubble.wobbleSpeed * delta,
          x: bubble.x + Math.sin(bubble.wobble) * 0.28,
        })
        .filter(bubble => bubble.y + bubble.size > -80 || bubble.popping));
      setParticles(previous => previous
        .map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.08,
          life: particle.life - 0.025,
          size: particle.size * 0.98,
        }))
        .filter(particle => particle.life > 0));
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [screen]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem('bubble-best', String(score));
    }
  }, [score, best]);

  const popBubble = useCallback((bubble: Bubble) => {
    if (screen !== 'playing' || bubble.popping) return;
    createParticles(bubble);
    setBubbles(previous => previous.map(item => item.id === bubble.id ? { ...item, keySlot: 0, popping: true } : item));
    window.setTimeout(() => {
      setBubbles(previous => previous.filter(item => item.id !== bubble.id));
    }, 240);

    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setShowCombo(nextCombo >= 3);
    window.clearTimeout(comboTimer.current);
    comboTimer.current = window.setTimeout(() => {
      setCombo(0);
      setShowCombo(false);
    }, 1400);

    let gained = bubble.kind === 'gold' ? 40 : bubble.kind === 'burst' ? 20 : 10;
    gained += Math.floor(nextCombo / 5) * 5;
    if (bubble.kind === 'time') {
      setTimeLeft(current => Math.min(MODE_CONFIG[mode].duration, current + 3));
      playSound(760);
    } else {
      playSound(bubble.kind === 'gold' ? 720 : 520);
    }
    setScore(current => current + gained);
    setPopped(current => current + 1);

    if (bubble.kind === 'burst') {
      setBubbles(previous => {
        const targets = previous
          .filter(item => item.id !== bubble.id && !item.popping)
          .sort((a, b) => {
            const da = Math.hypot(a.x - bubble.x, a.y - bubble.y);
            const db = Math.hypot(b.x - bubble.x, b.y - bubble.y);
            return da - db;
          })
          .slice(0, 3);
        targets.forEach(createParticles);
        setScore(current => current + targets.length * 10);
        setPopped(current => current + targets.length);
        return previous.map(item => targets.some(target => target.id === item.id) ? { ...item, keySlot: 0, popping: true } : item);
      });
    }
  }, [combo, createParticles, mode, playSound, screen]);

  const level = Math.floor(score / 500) + 1;
  const progress = Math.min(100, (score % 500) / 5);
  const keyboardTargets = bubbles
    .filter(bubble => !bubble.popping && bubble.keySlot > 0)
    .sort((a, b) => a.keySlot - b.keySlot)
    .slice(0, 9);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (screen === 'start') {
        if (event.key === '1') setMode('calm');
        if (event.key === '2') setMode('classic');
        if (event.key === '3') setMode('rush');
        if (event.key === 'Enter') {
          event.preventDefault();
          startGame();
        }
        return;
      }

      if (screen === 'paused') {
        if (event.key === 'Escape' || event.key.toLowerCase() === 'p' || event.key === 'Enter') {
          event.preventDefault();
          setScreen('playing');
        }
        return;
      }

      if (screen === 'playing') {
        if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
          event.preventDefault();
          setScreen('paused');
          return;
        }
        if (event.key.toLowerCase() === 'm') {
          event.preventDefault();
          setSoundOn(value => !value);
          return;
        }

        const targets = bubbles
          .filter(bubble => !bubble.popping && bubble.keySlot > 0)
          .sort((a, b) => a.keySlot - b.keySlot);

        if (/^[1-9]$/.test(event.key)) {
          event.preventDefault();
          const bubble = targets.find(item => item.keySlot === Number(event.key));
          if (bubble) popBubble(bubble);
        } else if (event.key === 'Enter' && targets[0]) {
          event.preventDefault();
          popBubble(targets[0]);
        }
      }

      if (screen === 'result' && event.key === 'Enter') {
        event.preventDefault();
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bubbles, popBubble, screen, startGame]);

  return (
    <main className="game-shell">
      {screen === 'start' && (
        <section className="start-screen">
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
          <div className="brand-mark"><span>🫧</span></div>
          <div className="start-copy">
            <p className="eyebrow">Multi-Mode Game</p>
            <h1>Bubble Game</h1>
            <p>Tap the bubbles, score points, and beat your high score.</p>
          </div>

          <div className="mode-grid" aria-label="Select game mode">
            {(Object.keys(MODE_CONFIG) as Mode[]).map(item => {
              const config = MODE_CONFIG[item];
              return (
                <button
                  key={item}
                  type="button"
                  className={`mode-card ${mode === item ? 'active' : ''}`}
                  onClick={() => setMode(item)}
                >
                  <span className="mode-icon">{item === 'calm' ? '🌿' : item === 'classic' ? '🫧' : '⚡'}</span>
                  <span><strong>{config.label}</strong><small>{config.duration} seconds</small></span>
                </button>
              );
            })}
          </div>

          <button type="button" className="primary-button" onClick={startGame}>Start Game <span>←</span></button>
          <div className="best-chip"><span>Best Score</span><strong>{best}</strong></div>
        </section>
      )}

      {screen === 'playing' && (
        <section className="play-screen">
          <div className="hud">
            <div className="hud-pill score-pill"><span>Score</span><strong>{score}</strong></div>
            <div className="time-ring" style={{ '--progress': `${(timeLeft / MODE_CONFIG[mode].duration) * 360}deg` } as CSSProperties}>
              <div><strong>{timeLeft}</strong><small>seconds</small></div>
            </div>
            <button type="button" className="icon-button" aria-label="Pause" onClick={() => setScreen('paused')}>Ⅱ</button>
          </div>

          <div className="level-track">
            <span>Level {level}</span>
            <div><i style={{ width: `${progress}%` }} /></div>
          </div>

          {showCombo && <div className="combo-badge"><strong>COMBO ×{combo}</strong></div>}

          {bubbles.map(bubble => {
            const keyNumber = bubble.keySlot;
            return (
              <button
                key={bubble.id}
                type="button"
                aria-label="Bubble"
                onPointerDown={() => popBubble(bubble)}
                className={`bubble bubble-${bubble.kind} ${bubble.popping ? 'popping' : ''}`}
                style={{
                  left: bubble.x,
                  top: bubble.y,
                  width: bubble.size,
                  height: bubble.size,
                  '--bubble-color': bubble.color,
                } as CSSProperties}
              >
                {keyNumber > 0 && <b className="keyboard-key">{keyNumber}</b>}
                {bubble.kind === 'gold' && <span>★</span>}
                {bubble.kind === 'time' && <span>+3</span>}
                {bubble.kind === 'burst' && <span>✦</span>}
                <i />
              </button>
            );
          })}

          <div className="keyboard-help" aria-label="Keyboard controls">
            <span><kbd>1–9</kbd> Pop</span>
            <span><kbd>P</kbd> Pause</span>
            <span><kbd>M</kbd> Sound</span>
          </div>

          {particles.map(particle => (
            <i key={particle.id} className="particle" style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              background: particle.color,
              opacity: particle.life,
              transform: `scale(${particle.life})`,
            }} />
          ))}
        </section>
      )}

      {screen === 'paused' && (
        <div className="overlay">
          <section className="dialog">
            <div className="dialog-icon">☕</div>
            <p className="eyebrow">Game Paused</p>
            <h2>Short Break</h2>
            <button type="button" className="primary-button" onClick={() => setScreen('playing')}>Continue</button>
            <button type="button" className="secondary-button" onClick={() => setScreen('start')}>Back to Home</button>
          </section>
        </div>
      )}

      {screen === 'result' && (
        <section className="result-screen">
          <div className="result-badge">{score >= best && score > 0 ? '🏆' : '🫧'}</div>
          <p className="eyebrow">Game Over</p>
          <h2>{score >= best && score > 0 ? 'New Record!' : 'Great Result!'}</h2>
          <div className="score-card">
            <span>Final Score</span>
            <strong>{score}</strong>
            <div><b>{popped}</b><small>Bubbles Popped</small></div>
          </div>
          <button type="button" className="primary-button" onClick={startGame}>Play Again</button>
          <button type="button" className="secondary-button" onClick={() => setScreen('start')}>Change Mode</button>
        </section>
      )}

      {screen !== 'start' && screen !== 'result' && (
        <button type="button" className={`sound-button ${soundOn ? '' : 'muted'}`} aria-label="Sound" onClick={() => setSoundOn(value => !value)}>
          {soundOn ? '♪' : '×'}
        </button>
      )}
    </main>
  );
}

export default BubbleGame;
