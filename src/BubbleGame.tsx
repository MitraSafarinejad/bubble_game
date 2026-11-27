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
  calm: { label: 'آرام', duration: 45, spawn: 1100, speed: 0.65, max: 10 },
  classic: { label: 'کلاسیک', duration: 60, spawn: 850, speed: 1, max: 14 },
  rush: { label: 'هیجان', duration: 30, spawn: 520, speed: 1.45, max: 18 },
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
      // صوت اختیاری است و نباید روند بازی را مختل کند
    }
  }, [soundOn]);

  const createBubble = useCallback((randomKind = true): Bubble => {
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
    const initial = Array.from({ length: 6 }, () => {
      const bubble = createBubble();
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
        return [...previous, createBubble()];
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
    setBubbles(previous => previous.map(item => item.id === bubble.id ? { ...item, popping: true } : item));
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
        return previous.map(item => targets.some(target => target.id === item.id) ? { ...item, popping: true } : item);
      });
    }
  }, [combo, createParticles, mode, playSound, screen]);

  const level = Math.floor(score / 500) + 1;
  const progress = Math.min(100, (score % 500) / 5);

  return (
    <main className="game-shell" dir="rtl">
      {screen === 'start' && (
        <section className="start-screen">
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
          <div className="brand-mark"><span>🫧</span></div>
          <div className="start-copy">
            <p className="eyebrow">بازی چند حالتی</p>
            <h1>حباب‌بازی</h1>
            <p>حباب‌ها را لمس کن، امتیاز جمع کن و رکوردت را شکست بده.</p>
          </div>

          <div className="mode-grid" aria-label="انتخاب حالت بازی">
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
                  <span><strong>{config.label}</strong><small>{config.duration} ثانیه</small></span>
                </button>
              );
            })}
          </div>

          <button type="button" className="primary-button" onClick={startGame}>شروع بازی <span>←</span></button>
          <div className="best-chip"><span>بهترین رکورد</span><strong>{best}</strong></div>
        </section>
      )}

      {screen === 'playing' && (
        <section className="play-screen">
          <div className="hud">
            <div className="hud-pill score-pill"><span>امتیاز</span><strong>{score}</strong></div>
            <div className="time-ring" style={{ '--progress': `${(timeLeft / MODE_CONFIG[mode].duration) * 360}deg` } as CSSProperties}>
              <div><strong>{timeLeft}</strong><small>ثانیه</small></div>
            </div>
            <button type="button" className="icon-button" aria-label="توقف" onClick={() => setScreen('paused')}>Ⅱ</button>
          </div>

          <div className="level-track">
            <span>سطح {level}</span>
            <div><i style={{ width: `${progress}%` }} /></div>
          </div>

          {showCombo && <div className="combo-badge"><strong>COMBO ×{combo}</strong></div>}

          {bubbles.map(bubble => (
            <button
              key={bubble.id}
              type="button"
              aria-label="حباب"
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
              {bubble.kind === 'gold' && <span>★</span>}
              {bubble.kind === 'time' && <span>+۳</span>}
              {bubble.kind === 'burst' && <span>✦</span>}
              <i />
            </button>
          ))}

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
            <p className="eyebrow">بازی متوقف شد</p>
            <h2>استراحت کوتاه</h2>
            <button type="button" className="primary-button" onClick={() => setScreen('playing')}>ادامه</button>
            <button type="button" className="secondary-button" onClick={() => setScreen('start')}>بازگشت به خانه</button>
          </section>
        </div>
      )}

      {screen === 'result' && (
        <section className="result-screen">
          <div className="result-badge">{score >= best && score > 0 ? '🏆' : '🫧'}</div>
          <p className="eyebrow">بازی تمام شد</p>
          <h2>{score >= best && score > 0 ? 'رکورد جدید!' : 'نتیجه عالی!'}</h2>
          <div className="score-card">
            <span>امتیاز نهایی</span>
            <strong>{score}</strong>
            <div><b>{popped}</b><small>حباب زده‌شده</small></div>
          </div>
          <button type="button" className="primary-button" onClick={startGame}>دوباره بازی کن</button>
          <button type="button" className="secondary-button" onClick={() => setScreen('start')}>تغییر حالت</button>
        </section>
      )}

      {screen !== 'start' && screen !== 'result' && (
        <button type="button" className={`sound-button ${soundOn ? '' : 'muted'}`} aria-label="صدا" onClick={() => setSoundOn(value => !value)}>
          {soundOn ? '♪' : '×'}
        </button>
      )}
    </main>
  );
}

export default BubbleGame;
