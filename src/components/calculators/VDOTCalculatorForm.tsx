'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { formatPaceSec } from '@/lib/format-pace';

// --- Daniels VDOT Mathematics ---

function percentVO2(t: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * t) +
    0.2989558 * Math.exp(-0.1932605 * t)
  );
}

function vo2AtVelocity(v: number): number {
  return -4.60 + 0.182258 * v + 0.000104 * v * v;
}

function velocityAtVO2(vo2: number): number {
  const a = 0.000104, b = 0.182258, c = -(vo2 + 4.60);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

function calcVDOT(distanceMetres: number, timeMinutes: number): number {
  const v = distanceMetres / timeMinutes;
  const vo2 = vo2AtVelocity(v);
  const pct = percentVO2(timeMinutes);
  return vo2 / pct;
}

const METRES_PER_MILE = 1609.344;

function velocityToPace(vMperMin: number, perMile = false): string {
  const unitMetres = perMile ? METRES_PER_MILE : 1000;
  const secsPerUnit = (unitMetres / vMperMin) * 60;
  return formatPaceSec(secsPerUnit);
}

function paceRange(vdot: number, loFrac: number, hiFrac: number, perMile = false): string {
  const lo = velocityToPace(velocityAtVO2(vdot * loFrac), perMile);
  const hi = velocityToPace(velocityAtVO2(vdot * hiFrac), perMile);
  return `${hi} – ${lo}`;
}

interface TrainingZone {
  zone: string;
  code: string;
  description: string;
  pace: string;
  effort: string;
  color: string;
}

function getTrainingPaces(vdot: number, perMile = false): TrainingZone[] {
  return [
    {
      zone: 'E / Easy',
      code: 'E',
      description: 'Conversational aerobic base',
      pace: paceRange(vdot, 0.59, 0.74, perMile),
      effort: 'Zone 1–2',
      color: '#4ade80',
    },
    {
      zone: 'M / Marathon',
      code: 'M',
      description: 'Marathon race pace',
      pace: paceRange(vdot, 0.75, 0.84, perMile),
      effort: 'Zone 3',
      color: '#60a5fa',
    },
    {
      zone: 'T / Threshold',
      code: 'T',
      description: 'Comfortably hard, ~60 min max',
      pace: paceRange(vdot, 0.83, 0.88, perMile),
      effort: 'Zone 3–4',
      color: '#f59e0b',
    },
    {
      zone: 'I / Interval',
      code: 'I',
      description: '3–5 min repeats, VO₂max stimulus',
      pace: paceRange(vdot, 0.95, 1.0, perMile),
      effort: 'Zone 5',
      color: '#f97316',
    },
    {
      zone: 'R / Repetition',
      code: 'R',
      description: 'Short fast reps, pure speed',
      pace: paceRange(vdot, 1.05, 1.2, perMile),
      effort: 'Zone 5+',
      color: '#e879f9',
    },
  ];
}

// --- Race distance options ---

const DISTANCES = [
  { label: '1,500m', metres: 1500 },
  { label: '1 Mile', metres: 1609.34 },
  { label: '3,000m', metres: 3000 },
  { label: '5K', metres: 5000 },
  { label: '8K', metres: 8000 },
  { label: '10K', metres: 10000 },
  { label: '15K', metres: 15000 },
  { label: 'Half Marathon', metres: 21097.5 },
  { label: 'Marathon', metres: 42195 },
];

function timeToMinutes(h: string, m: string, s: string): number {
  return parseInt(h || '0') * 60 + parseInt(m || '0') + parseInt(s || '0') / 60;
}

function vdotColor(vdot: number): string {
  if (vdot >= 70) return '#e879f9';
  if (vdot >= 60) return '#f97316';
  if (vdot >= 50) return '#f59e0b';
  if (vdot >= 40) return '#60a5fa';
  return '#4ade80';
}

export default function VDOTCalculatorForm() {
  const [distIdx, setDistIdx] = useState(3); // default 5K
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [secs, setSecs] = useState('');
  const [result, setResult] = useState<{ vdot: number } | null>(null);
  const [error, setError] = useState('');
  const [perMile, setPerMile] = useState(false);

  const calculate = useCallback(() => {
    const totalMins = timeToMinutes(hours, mins, secs);
    if (totalMins <= 0) {
      setError('Enter a finish time above zero.');
      setResult(null);
      return;
    }
    const distMetres = DISTANCES[distIdx].metres;
    if (distMetres / totalMins < 1000 / 12) {
      setError('Pace seems too slow — check your time.');
      setResult(null);
      return;
    }
    const vdot = calcVDOT(distMetres, totalMins);
    if (vdot < 20 || vdot > 85) {
      setError('Result out of VDOT range (20–85). Check your inputs.');
      setResult(null);
      return;
    }
    setError('');
    setResult({ vdot });
  }, [distIdx, hours, mins, secs]);

  const handleClear = () => {
    setHours('');
    setMins('');
    setSecs('');
    setResult(null);
    setError('');
  };

  const timeDisplay = [
    parseInt(hours) > 0 ? `${hours || '0'}h` : null,
    `${mins || '0'}m`,
    `${secs || '0'}s`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-6 font-body">
      {/* Distance selector */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Race Distance
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DISTANCES.map((d, i) => (
            <button
              key={d.label}
              onClick={() => setDistIdx(i)}
              className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                distIdx === i
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time input */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Finish Time
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-0">
          <div>
            <Input
              type="number"
              min={0}
              max={23}
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="text-center text-lg font-semibold tabular-nums bg-card border-border"
            />
            <p className="text-xs text-muted-foreground text-center mt-1 uppercase tracking-wider">HH</p>
          </div>
          <span className="text-xl font-bold text-muted-foreground px-1 pb-5 text-center">:</span>
          <div>
            <Input
              type="number"
              min={0}
              max={59}
              placeholder="25"
              value={mins}
              onChange={(e) => setMins(e.target.value)}
              className="text-center text-lg font-semibold tabular-nums bg-card border-border"
            />
            <p className="text-xs text-muted-foreground text-center mt-1 uppercase tracking-wider">MM</p>
          </div>
          <span className="text-xl font-bold text-muted-foreground px-1 pb-5 text-center">:</span>
          <div>
            <Input
              type="number"
              min={0}
              max={59}
              placeholder="00"
              value={secs}
              onChange={(e) => setSecs(e.target.value)}
              className="text-center text-lg font-semibold tabular-nums bg-card border-border"
            />
            <p className="text-xs text-muted-foreground text-center mt-1 uppercase tracking-wider">SS</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={calculate} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-headline uppercase tracking-wide py-3 text-base">
          Calculate VDOT
        </Button>
        {result && (
          <Button variant="outline" onClick={handleClear} className="border-border text-muted-foreground hover:bg-muted">
            Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* VDOT badge */}
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div
              className="text-7xl font-extrabold leading-none tabular-nums"
              style={{ color: vdotColor(result.vdot), letterSpacing: '-2px' }}
            >
              {result.vdot.toFixed(1)}
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">VDOT Score</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Based on {DISTANCES[distIdx].label} in {timeDisplay}
            </p>
          </div>

          {/* Training paces */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Training Zone Paces
              </p>
              {/* km / mi toggle */}
              <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
                {(['km', 'mi'] as const).map((unit) => {
                  const active = unit === 'mi' ? perMile : !perMile;
                  return (
                    <button
                      key={unit}
                      onClick={() => setPerMile(unit === 'mi')}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {unit}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {getTrainingPaces(result.vdot, perMile).map((z) => (
                <div
                  key={z.code}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  style={{ borderLeft: `3px solid ${z.color}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: z.color }}>
                      {z.zone}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{z.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold tabular-nums text-foreground" style={{ letterSpacing: '-0.5px' }}>
                      {z.pace}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {z.effort} · /{perMile ? 'mi' : 'km'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed pt-2">
            Paces derived from Daniels' Running Formula. T pace shown as a range; use the slower end for cruise intervals, faster end for shorter tempo runs. Hyrox athletes: E and T paces are your primary training targets.
          </p>
        </div>
      )}
    </div>
  );
}
