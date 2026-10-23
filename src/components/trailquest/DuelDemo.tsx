'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sprite } from './data';
import styles from './DuelDemo.module.css';

/*
 * A duel with the Red Fox, played in the browser on a drawn UNA face. It is a
 * cut-down duel and the page says so, but it is built on the game's rules:
 *   - the beat (Beat.hpp): the needle runs at 10 frames a second, as on the
 *     watch, so what is drawn is what is judged; stage 1's beat is a 1600 ms
 *     sweep with a 400 ms good zone and a 200 ms perfect one, Surge 150 ms
 *     faster and 50 narrower, Settle 150 slower and 60 wider; the target moves
 *     between 30% and 85% of the sweep;
 *   - the press: Miss x1/2, Good x1, Perfect x3/2 (Duel.hpp);
 *   - the wheel: Pace beats Form beats Grit beats Pace (Story.hpp);
 *   - the moves: Surge (Pace, 14), Trail craft (Form, 9), Settle (Grit, 5,
 *     and braces for the next hit); the fox's Side stitch (7, drains) and
 *     Pounce (9); a Gel restores 15 (Moves.hpp, Items.hpp).
 * The stamina figures are the demo's, chosen so a duel takes about a minute.
 */

// An arc of the bezel at radius 113, between two angles in degrees (clockwise from 3 o'clock).
function arc(from: number, to: number) {
  const p = (a: number) => `${(120 + 113 * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(120 + 113 * Math.sin((a * Math.PI) / 180)).toFixed(1)}`;
  return `M${p(from)} A113 113 0 0 1 ${p(to)}`;
}

type Aff = 'Pace' | 'Form' | 'Grit';
type MoveKey = 'surge' | 'skill' | 'settle';
const BEATS: Record<Aff, Aff> = { Pace: 'Form', Form: 'Grit', Grit: 'Pace' };

const MOVES: Record<MoveKey, { name: string; aff: Aff; power: number; sweep: number; good: number }> = {
  surge: { name: 'Surge', aff: 'Pace', power: 14, sweep: 1450, good: 350 },
  skill: { name: 'Trail craft', aff: 'Form', power: 9, sweep: 1600, good: 400 },
  settle: { name: 'Settle', aff: 'Grit', power: 5, sweep: 1750, good: 460 },
};

const FOX = { name: 'Red Fox', aff: 'Pace' as Aff, max: 40 };
const YOU_MAX = 50;
const PERFECT = 200;
const FRAME = 100;

type Phase = 'choose' | 'beat' | 'events' | 'won' | 'lost';
type Beat = { move: MoveKey; sweep: number; good: number; target: number; start: number };
type Line = { a: string; b?: string; tone: 'good' | 'bad' | 'plain' };

// Short jingles, as the watch plays them: good news rises, bad news falls.
const JINGLES = {
  hit: [660, 880],
  perfect: [660, 880, 1320],
  miss: [440, 330],
  hurt: [392, 294],
  win: [523, 659, 784, 1047],
  lose: [392, 330, 262],
  fuel: [523, 784],
} as const;
const BUZZ = {
  hit: [40],
  perfect: [30, 40, 30, 40, 60],
  miss: [160],
  hurt: [90, 60, 90],
  win: [60, 50, 60, 50, 200],
  lose: [300],
  fuel: [30, 60, 30],
} as const;

export default function DuelDemo() {
  const [phase, setPhase] = useState<Phase>('choose');
  const [you, setYou] = useState(YOU_MAX);
  const [fox, setFox] = useState(FOX.max);
  const [gels, setGels] = useState(1);
  const [drain, setDrain] = useState(0);
  const [brace, setBrace] = useState(false);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [lineAt, setLineAt] = useState(0);
  const [tick, setTick] = useState(0);
  const [blink, setBlink] = useState<'fox' | 'you' | null>(null);
  const [sound, setSound] = useState(false);
  const [buzz, setBuzz] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useRef(true);

  // One clock at the watch's 10 frames a second, paused off screen.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    if (rootRef.current) io.observe(rootRef.current);
    const t = window.setInterval(() => visible.current && setTick((n) => n + 1), FRAME);
    return () => {
      io.disconnect();
      window.clearInterval(t);
    };
  }, []);

  const feel = useCallback(
    (k: keyof typeof JINGLES) => {
      if (buzz && 'vibrate' in navigator) navigator.vibrate([...BUZZ[k]]);
      if (!sound) return;
      const ctx = (audio.current ??= new AudioContext());
      JINGLES[k].forEach((f, n) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = f;
        const t0 = ctx.currentTime + n * 0.09;
        g.gain.setValueAtTime(0.06, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
        o.connect(g).connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + 0.09);
      });
    },
    [buzz, sound],
  );

  // Where the needle is, in whole frames since the beat began.
  const needle = beat ? (((tick - beat.start) * FRAME) % beat.sweep + beat.sweep) % beat.sweep : 0;

  const choose = (m: MoveKey) => {
    if (phase !== 'choose') return;
    const mv = MOVES[m];
    const lo = Math.ceil((mv.sweep * 0.3) / FRAME) * FRAME;
    const hi = Math.floor((mv.sweep * 0.85) / FRAME) * FRAME;
    const target = lo + Math.floor(Math.random() * ((hi - lo) / FRAME + 1)) * FRAME;
    setBeat({ move: m, sweep: mv.sweep, good: mv.good, target, start: tick });
    setPhase('beat');
  };

  // The fox's turn, and the drain, after the runner's.
  const foxTurn = (foxLeft: number, braced: boolean, out: Line[]) => {
    let left = you;
    if (drain > 0) {
      left -= 2;
      out.push({ a: 'Side stitch', b: 'You lose 2', tone: 'bad' });
    }
    if (foxLeft <= 0) return { left, nextDrain: drain };
    const stitch = Math.random() < 0.45;
    const raw = stitch ? 7 : 9;
    const hit = braced ? Math.ceil(raw / 2) : raw;
    left -= hit;
    out.push({ a: `Fox: ${stitch ? 'Side stitch' : 'Pounce'}`, b: braced ? `Braced. You lose ${hit}` : `You lose ${hit}`, tone: 'bad' });
    return { left, nextDrain: stitch ? 2 : Math.max(0, drain - 1) };
  };

  const finishTurn = (out: Line[], foxLeft: number, youLeft: number, nextDrain: number) => {
    setLines(out);
    setLineAt(0);
    setPhase('events');
    setFox(Math.max(0, foxLeft));
    setYou(Math.max(0, Math.min(YOU_MAX, youLeft)));
    setDrain(foxLeft <= 0 ? 0 : nextDrain);
  };

  const strike = () => {
    if (phase !== 'beat' || !beat) return;
    const off = needle - beat.target;
    const res = Math.abs(off) <= PERFECT / 2 ? 'PERFECT' : Math.abs(off) <= beat.good / 2 ? 'GOOD' : 'MISS';
    const mv = MOVES[beat.move];
    const wheel = BEATS[mv.aff] === FOX.aff ? 1.5 : BEATS[FOX.aff] === mv.aff ? 0.5 : 1;
    const press = res === 'PERFECT' ? 1.5 : res === 'GOOD' ? 1 : 0.5;
    const dmg = Math.max(1, Math.round(mv.power * wheel * press));
    const foxLeft = fox - dmg;
    const out: Line[] = [
      {
        a: `${mv.name}! ${res}`,
        b: `Hit ${dmg}${wheel > 1 ? ', strong' : wheel < 1 ? ', weak' : ''}`,
        tone: res === 'MISS' ? 'bad' : 'good',
      },
    ];
    feel(res === 'PERFECT' ? 'perfect' : res === 'GOOD' ? 'hit' : 'miss');
    setBlink('fox');
    const braced = beat.move === 'settle' || brace;
    const { left, nextDrain } = foxTurn(foxLeft, braced, out);
    setBrace(false);
    setBeat(null);
    finishTurn(out, foxLeft, left, nextDrain);
  };

  const fuel = () => {
    if (phase !== 'choose') return;
    if (gels === 0) {
      setLines([{ a: 'Bag empty', b: 'No Gel left', tone: 'bad' }]);
      setLineAt(0);
      setPhase('events');
      return;
    }
    feel('fuel');
    setGels(0);
    const out: Line[] = [{ a: 'Gel', b: 'Plus 15 stamina', tone: 'good' }];
    const { left, nextDrain } = foxTurn(fox, false, out);
    finishTurn(out, fox, Math.min(YOU_MAX, you + 15) - (you - left), nextDrain);
  };

  // Play the turn's lines out, one a second, then the result.
  useEffect(() => {
    if (phase !== 'events') return;
    const t = window.setTimeout(() => {
      setBlink(null);
      if (lineAt + 1 < lines.length) {
        setLineAt(lineAt + 1);
        if (lines[lineAt + 1].tone === 'bad') {
          feel('hurt');
          setBlink('you');
        }
        return;
      }
      if (fox <= 0) {
        setPhase('won');
        feel('win');
      } else if (you <= 0) {
        setPhase('lost');
        feel('lose');
      } else setPhase('choose');
    }, 1100);
    return () => window.clearTimeout(t);
  }, [phase, lineAt, lines, fox, you, feel]);

  const reset = () => {
    setPhase('choose');
    setYou(YOU_MAX);
    setFox(FOX.max);
    setGels(1);
    setDrain(0);
    setBrace(false);
    setLines([]);
    setBeat(null);
  };

  // Space, Enter or a number key, as a quick way to play on a laptop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!visible.current) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (phase === 'beat' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        strike();
      } else if (phase === 'choose') {
        if (e.key === '1') choose('surge');
        if (e.key === '2') choose('skill');
        if (e.key === '3') choose('settle');
        if (e.key === '4') fuel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const frame = Math.floor(tick / 5) % 2 ? 1 : 0;
  const line = lines[lineAt];
  const zoneX = (ms: number) => 34 + (ms / (beat?.sweep ?? 1600)) * 172;

  return (
    <div ref={rootRef} className={styles.wrap}>
      <div className={styles.watch}>
        <div
          className={styles.face}
          onClick={() => (phase === 'beat' ? strike() : undefined)}
          role="img"
          aria-label={`Duel with the Red Fox. Fox ${fox} of ${FOX.max}, you ${you} of ${YOU_MAX}.`}
        >
          <svg viewBox="0 0 240 240" className={styles.svg}>
            <rect width="240" height="240" fill="#000" />
            {/* the spirit's stamina */}
            <rect x="70" y="12" width="100" height="6" fill="#404040" />
            <rect x="70" y="12" width={(100 * fox) / FOX.max} height="6" fill="#c00000" />
            <text x="120" y="38" className={styles.num}>{`${fox}/${FOX.max}`}</text>

            {/* the band: the moves, or what is happening */}
            <rect x="0" y="46" width="240" height="4" fill="#0080c0" />
            <rect x="0" y="50" width="240" height="44" fill="#000040" />
            {phase === 'choose' && (
              <>
                <text x="120" y="68" className={styles.band}>
                  <tspan fill="#ff9900">Surge</tspan>
                  <tspan fill="#00e000">{' '}Skill</tspan>
                </text>
                <text x="120" y="88" className={styles.small} fill="#c0c0c0">Pick a move</text>
              </>
            )}
            {phase === 'beat' && beat && (
              <>
                <text x="120" y="68" className={styles.band} fill="#ffcc00">{`${MOVES[beat.move].name}!`}</text>
                <text x="120" y="88" className={styles.small} fill="#c0c0c0">Press in the green</text>
              </>
            )}
            {phase === 'events' && line && (
              <>
                <text x="120" y="68" className={styles.band} fill={line.tone === 'bad' ? '#ff4040' : '#ffcc00'}>{line.a}</text>
                {line.b ? <text x="120" y="88" className={styles.small} fill="#ffffff">{line.b}</text> : null}
              </>
            )}
            {phase === 'won' && (
              <>
                <text x="120" y="68" className={styles.band} fill="#ffff00">BEATEN</text>
                <text x="120" y="88" className={styles.small} fill="#ffffff">Red Fox joins you?</text>
              </>
            )}
            {phase === 'lost' && (
              <>
                <text x="120" y="68" className={styles.band} fill="#ff4040">Spent</text>
                <text x="120" y="88" className={styles.small} fill="#ffffff">Eat earlier. Again?</text>
              </>
            )}

            {/* the scene */}
            <rect x="0" y="94" width="240" height="4" fill="#0080c0" />
            <rect x="0" y="98" width="240" height="22" fill="#00c000" />
            <rect x="0" y="120" width="240" height="22" fill="#008000" />
            <rect x="0" y="142" width="240" height="18" fill="#804000" />
            <image
              href={sprite('runner', frame as 0 | 1)}
              x="44"
              y="104"
              width="48"
              height="48"
              className={`${styles.px} ${blink === 'you' ? styles.blink : ''}`}
            />
            {phase !== 'won' && (
              <image
                href={sprite('fox', frame as 0 | 1)}
                x="148"
                y="104"
                width="48"
                height="48"
                className={`${styles.px} ${blink === 'fox' ? styles.blink : ''}`}
              />
            )}
            {phase === 'won' && <image href={sprite('fox', frame as 0 | 1)} x="148" y="104" width="48" height="48" className={styles.px} opacity="0.5" />}

            {/* the beat */}
            {phase === 'beat' && beat && (
              <g>
                <rect x="30" y="164" width="180" height="14" fill="#404040" />
                <rect x={zoneX(beat.target - beat.good / 2)} y="166" width={(beat.good / beat.sweep) * 172} height="10" fill="#ff9900" />
                <rect x={zoneX(beat.target - PERFECT / 2)} y="166" width={(PERFECT / beat.sweep) * 172} height="10" fill="#00e000" />
                <rect x={zoneX(needle) - 1.5} y="161" width="3" height="20" fill="#ffffff" />
              </g>
            )}
            {phase === 'choose' && (
              <text x="120" y="176" className={styles.band}>
                <tspan fill="#ffffff">Settle</tspan>
                <tspan fill="#ff3030">{gels ? ' Fuel' : ' ----'}</tspan>
              </text>
            )}

            {/* your stamina, and any effect on you */}
            <rect x="70" y="190" width="100" height="6" fill="#404040" />
            <rect x="70" y="190" width={(100 * you) / YOU_MAX} height="6" fill="#00c000" />
            <text x="120" y="216" className={styles.num}>{`${you}/${YOU_MAX}`}</text>
            {drain > 0 && phase !== 'won' ? <text x="186" y="216" className={styles.small} fill="#ff4040">DRN</text> : null}

            {/* the bezel's four arcs */}
            <g fill="none" strokeWidth="5" strokeLinecap="round">
              <path d={arc(-158.6, -142.3)} stroke="#ff9900" />
              <path d={arc(-37.7, -21.4)} stroke="#00e000" />
              <path d={arc(142.3, 158.6)} stroke="#ffffff" />
              <path d={arc(21.4, 37.7)} stroke="#ff3030" />
            </g>
          </svg>
        </div>
        <Image src="/weigh-in/una-watch-black.png" alt="" fill sizes="(max-width: 860px) 80vw, 440px" className={styles.render} />
      </div>

      <div className={styles.controls}>
        {phase === 'beat' ? (
          <button type="button" className={styles.strike} onClick={strike}>
            Press now
            <span>or tap the watch, or Space</span>
          </button>
        ) : phase === 'won' || phase === 'lost' ? (
          <div className={styles.end}>
            <p className={styles.endTitle}>{phase === 'won' ? 'You beat the Red Fox.' : 'The fox wins this one.'}</p>
            <p>
              {phase === 'won'
                ? 'In the game, a beaten spirit can join your pack, and its moves become yours to use in the next duel.'
                : 'Try Settle: Grit beats Pace, and it braces you for the next hit. And use your Gel before you need it.'}
            </p>
            <button type="button" className={styles.again} onClick={reset}>
              Run it again
            </button>
          </div>
        ) : (
          <div className={styles.moves} aria-label="Moves">
            {(
              [
                ['surge', 'Surge', 'Pace · 14 · fast needle', '#ff9900'],
                ['skill', 'Skill', 'Trail craft · Form · 9', '#00e000'],
                ['settle', 'Settle', 'Grit · 5 · braces you', '#ffffff'],
              ] as const
            ).map(([k, name, sub, c]) => (
              <button key={k} type="button" className={styles.move} style={{ '--c': c } as React.CSSProperties} onClick={() => choose(k)} disabled={phase !== 'choose'}>
                <strong>{name}</strong>
                <span>{sub}</span>
              </button>
            ))}
            <button type="button" className={styles.move} style={{ '--c': '#ff3030' } as React.CSSProperties} onClick={fuel} disabled={phase !== 'choose'}>
              <strong>Fuel</strong>
              <span>{gels ? 'Gel · plus 15 · one left' : 'Bag empty'}</span>
            </button>
          </div>
        )}

        <div className={styles.toggles}>
          <label>
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Jingles
          </label>
          <label>
            <input type="checkbox" checked={buzz} onChange={(e) => setBuzz(e.target.checked)} /> Buzz (phones)
          </label>
        </div>
      </div>
    </div>
  );
}
