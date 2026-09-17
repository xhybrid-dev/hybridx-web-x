'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileHeart,
  Loader2,
  Plus,
  Repeat as RepeatIcon,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { generateFit } from '@/lib/fit';
import { parseTreadmillWorkout } from '@/ai/flows/parse-treadmill-workout-flow';
import { useToast } from '@/hooks/use-toast';
import {
  type BlockDraft,
  type FlatSegment,
  type RepeatDraft,
  type SegmentDraft,
  type SensorAlign,
  type SensorTrack,
  type Unit,
  computeTotals,
  estimateCalories,
  flattenBlocks,
  fmtHMS,
  fmtMinSec,
  generateTcx,
  metersToDistStr,
  parseDistanceToMeters,
  parseDurationSec,
  parseIncline,
  parseMinSec,
  parsePaceToSecPerKm,
  parseSensorFile,
  secPerKmToPaceStr,
  speedHint,
  unitMeters,
} from '@/lib/tcx';

/* ---------------- id + template helpers ---------------- */

let idCounter = 1;
const nextId = () => idCounter++;

function seg(opts: Partial<SegmentDraft>): SegmentDraft {
  return {
    id: nextId(),
    kind: 'segment',
    name: 'Segment',
    mode: 'time',
    value: '5:00',
    pace: '6:00',
    incline: '1',
    ...opts,
  };
}

function rep(children: SegmentDraft[], count: number, skipLastRest: boolean): RepeatDraft {
  return { id: nextId(), kind: 'repeat', count, skipLastRest, children };
}

const TEMPLATES: { key: string; label: string; build: () => BlockDraft[] }[] = [
  {
    key: 'timeIntervals',
    label: 'Time intervals',
    build: () => [
      seg({ name: 'Warm-up', value: '5:00', pace: '7:00' }),
      rep(
        [
          seg({ name: 'Work', value: '2:00', pace: '4:30' }),
          seg({ name: 'Recovery', value: '1:00', pace: '7:30' }),
        ],
        6,
        true,
      ),
      seg({ name: 'Cool-down', value: '5:00', pace: '7:00' }),
    ],
  },
  {
    key: 'distIntervals',
    label: 'Distance intervals',
    build: () => [
      seg({ name: 'Warm-up', mode: 'distance', value: '1', pace: '7:00' }),
      rep(
        [
          seg({ name: 'Work 400m', mode: 'distance', value: '0.4', pace: '4:00' }),
          seg({ name: 'Jog 200m', mode: 'distance', value: '0.2', pace: '8:00' }),
        ],
        6,
        true,
      ),
      seg({ name: 'Cool-down', mode: 'distance', value: '1', pace: '7:00' }),
    ],
  },
  {
    key: 'steady',
    label: 'Steady state',
    build: () => [seg({ name: 'Steady run', value: '30:00', pace: '6:00' })],
  },
  {
    key: 'fixedDistance',
    label: 'Fixed distance',
    build: () => [seg({ name: 'Run', mode: 'distance', value: '10', pace: '5:30' })],
  },
  {
    key: 'fixedTime',
    label: 'Fixed time',
    build: () => [seg({ name: 'Run', value: '45:00', pace: '5:30' })],
  },
  { key: 'blank', label: 'Blank', build: () => [seg({ name: 'Segment 1' })] },
];

const STORAGE_KEY = 'hybridx-tcx-generator-v1';

/* ---------------- immutable block updates ---------------- */

function updateSegmentById(
  blocks: BlockDraft[],
  id: number,
  patch: Partial<SegmentDraft>,
): BlockDraft[] {
  return blocks.map((b) => {
    if (b.kind === 'segment') return b.id === id ? { ...b, ...patch } : b;
    return {
      ...b,
      children: b.children.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    };
  });
}

function moveInArray<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const swap = idx + dir;
  if (idx < 0 || swap < 0 || swap >= arr.length) return arr;
  const copy = [...arr];
  [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
  return copy;
}

/* ---------------- small presentational bits ---------------- */

const fieldLabelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const monoInputClass = 'font-mono bg-background/70 border-border/70 focus:border-primary';

interface SegmentRowProps {
  segment: SegmentDraft;
  unit: Unit;
  isChild: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPatch: (patch: Partial<SegmentDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}

function SegmentRow({ segment, unit, isChild, canMoveUp, canMoveDown, onPatch, onMove, onDelete }: SegmentRowProps) {
  const durationValid =
    segment.mode === 'time'
      ? parseDurationSec(segment.value) !== null
      : parseDistanceToMeters(segment.value, unit) !== null;
  const paceValid = parsePaceToSecPerKm(segment.pace, unit) !== null;
  const inclineValid = parseIncline(segment.incline) !== null;
  const hint = speedHint(segment.pace, unit);

  const handleModeChange = (mode: string) => {
    if (mode === segment.mode) return;
    // Convert via pace so the segment's total stays the same
    const paceSecPerKm = parsePaceToSecPerKm(segment.pace, unit);
    if (paceSecPerKm !== null) {
      const speedMps = 1000 / paceSecPerKm;
      if (mode === 'time') {
        const d = parseDistanceToMeters(segment.value, unit);
        if (d !== null) {
          onPatch({ mode: 'time', value: fmtMinSec(d / speedMps) });
          return;
        }
      } else {
        const t = parseDurationSec(segment.value);
        if (t !== null) {
          onPatch({ mode: 'distance', value: metersToDistStr(speedMps * t, unit) });
          return;
        }
      }
    }
    onPatch({ mode: mode as SegmentDraft['mode'] });
  };

  return (
    <div className={`rounded-lg border bg-card/60 ${isChild ? 'border-border/50' : 'border-border/70'}`}>
      <div className="flex items-center gap-1 px-3 pt-2.5">
        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
          {isChild ? 'Step' : 'Segment'}
        </span>
        <Input
          value={segment.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          aria-label="Segment name"
          className="h-8 flex-1 border-none bg-transparent px-2 font-semibold shadow-none focus-visible:ring-1"
        />
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveUp} onClick={() => onMove(-1)} aria-label="Move up">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveDown} onClick={() => onMove(1)} aria-label="Move down">
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Remove segment">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
        <div>
          <Label className={fieldLabelClass}>{segment.mode === 'time' ? 'Duration' : 'Distance'}</Label>
          <div className="mt-1 flex">
            <Input
              value={segment.value}
              onChange={(e) => onPatch({ value: e.target.value })}
              aria-label={segment.mode === 'time' ? 'Duration (minutes:seconds)' : `Distance (${unit})`}
              className={`${monoInputClass} rounded-r-none ${durationValid ? '' : 'border-destructive'}`}
            />
            <Select value={segment.mode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-[72px] rounded-l-none border-l-0 bg-background/70 text-xs" aria-label="Measure by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">min</SelectItem>
                <SelectItem value="distance">{unit}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {segment.mode === 'time' && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">5 = 5:00 &middot; 5.5 = 5:30</p>
          )}
        </div>
        <div>
          <Label className={fieldLabelClass}>Pace /{unit}</Label>
          <Input
            value={segment.pace}
            onChange={(e) => onPatch({ pace: e.target.value })}
            aria-label={`Pace (minutes:seconds per ${unit})`}
            className={`mt-1 ${monoInputClass} ${paceValid ? '' : 'border-destructive'}`}
          />
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{hint ? `= ${hint}` : ' '}</p>
        </div>
        <div>
          <Label className={fieldLabelClass}>Incline %</Label>
          <Input
            type="number"
            step="0.5"
            value={segment.incline}
            onChange={(e) => onPatch({ incline: e.target.value })}
            aria-label="Incline percent"
            className={`mt-1 ${monoInputClass} ${inclineValid ? '' : 'border-destructive'}`}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- effort profile chart ---------------- */

function EffortChart({ segments, totals, unit }: { segments: FlatSegment[]; totals: { timeSec: number }; unit: Unit }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!segments.length || totals.timeSec <= 0) return null;

  const W = 600;
  const H = 116;
  const base = 92;
  const speeds = segments.map((s) => s.speedMps);
  const vMin = Math.min(...speeds);
  const vMax = Math.max(...speeds);
  const span = vMax - vMin || 1;
  const inclines = segments.map((s) => s.incline);
  const iMax = Math.max(4, ...inclines);
  const iMin = Math.min(0, ...inclines);
  const iSpan = iMax - iMin || 1;

  let x = 0;
  const bars: { x: number; w: number; h: number; op: number; iy: number }[] = segments.map((s) => {
    const w = (s.timeSec / totals.timeSec) * W;
    const hNorm = (s.speedMps - vMin) / span;
    const bar = {
      x,
      w,
      h: 16 + hNorm * 66,
      op: 0.4 + hNorm * 0.6,
      iy: base + 14 - ((s.incline - iMin) / iSpan) * 10,
    };
    x += w;
    return bar;
  });

  const inclinePath = bars
    .map((b, i) => `${i === 0 ? 'M' : 'L'}${b.x.toFixed(2)} ${b.iy.toFixed(2)} L${(b.x + b.w).toFixed(2)} ${b.iy.toFixed(2)}`)
    .join(' ');

  const hoveredSeg = hovered !== null ? segments[hovered] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Workout effort profile: bar height shows speed, the line underneath shows incline"
        preserveAspectRatio="none"
        className="block h-auto w-full"
        onMouseLeave={() => setHovered(null)}
      >
        <line x1="0" y1={base} x2={W} y2={base} stroke="hsl(var(--border))" strokeWidth="1" />
        {bars.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={base - b.h}
            width={Math.max(b.w - 1, 0.8)}
            height={b.h}
            rx="1.5"
            fill="hsl(var(--chart-1))"
            fillOpacity={hovered === i ? 1 : b.op}
            stroke={hovered === i ? 'hsl(var(--foreground))' : 'none'}
            strokeWidth={hovered === i ? 1 : 0}
            onMouseEnter={() => setHovered(i)}
          />
        ))}
        <path d={inclinePath} stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth="1.75" fill="none" />
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
        <span>
          <span className="text-foreground/80">&#9608;</span> speed &nbsp;
          <span className="text-foreground/80">&mdash;</span> incline
        </span>
        <span className="min-h-[14px]">
          {hoveredSeg
            ? `${hoveredSeg.name} · ${fmtMinSec(hoveredSeg.timeSec)} · ${secPerKmToPaceStr(1000 / hoveredSeg.speedMps, unit)}/${unit} · ${hoveredSeg.incline}%`
            : ''}
        </span>
      </div>
    </div>
  );
}

/* ---------------- main component ---------------- */

export default function TreadmillTcxGeneratorForm() {
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [unit, setUnit] = useState<Unit>('km');
  const [sessionName, setSessionName] = useState('Treadmill Session');
  const [sessionType, setSessionType] = useState<'treadmill' | 'outdoor'>('treadmill');
  const [startTime, setStartTime] = useState('');
  const [weight, setWeight] = useState('');
  const [resolution, setResolution] = useState('1');
  const [startElev, setStartElev] = useState('20');
  const [anchorLat, setAnchorLat] = useState('51.0140');
  const [anchorLon, setAnchorLon] = useState('-3.0136');
  const [loopRadius, setLoopRadius] = useState('22');
  const [sensor, setSensor] = useState<SensorTrack | null>(null);
  const [sensorAlign, setSensorAlign] = useState<SensorAlign>('stretch');
  const [showSplits, setShowSplits] = useState(false);
  const [fitExporting, setFitExporting] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiReferencePace, setAiReferencePace] = useState('');
  const [aiReferencePaceLabel, setAiReferencePaceLabel] = useState('easy pace');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAssumptions, setAiAssumptions] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Restore saved state (or the default template) after mount so SSR markup stays stable
  useEffect(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    setStartTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data.blocks) && data.blocks.length) {
          let maxId = 0;
          const walk = (arr: BlockDraft[]) =>
            arr.forEach((b) => {
              maxId = Math.max(maxId, b.id);
              if (b.kind === 'repeat') walk(b.children as BlockDraft[]);
            });
          walk(data.blocks);
          idCounter = maxId + 1;
          setBlocks(data.blocks);
          if (data.unit === 'km' || data.unit === 'mi') setUnit(data.unit);
          if (typeof data.sessionName === 'string') setSessionName(data.sessionName);
          if (typeof data.weight === 'string') setWeight(data.weight);
          setHydrated(true);
          return;
        }
      }
    } catch {
      /* corrupted saved state — fall through to the default */
    }
    setBlocks(TEMPLATES[0].build());
    setHydrated(true);
  }, []);

  // Autosave the workout so an accidental refresh doesn't wipe it
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ blocks, unit, sessionName, weight }));
    } catch {
      /* storage full or unavailable — autosave is best-effort */
    }
  }, [blocks, unit, sessionName, weight, hydrated]);

  const { segments, hasErrors } = useMemo(() => flattenBlocks(blocks, unit), [blocks, unit]);
  const totals = useMemo(() => computeTotals(segments), [segments]);
  const weightKg = parseFloat(weight) || 0;
  const calories = useMemo(
    () => (weightKg > 0 ? estimateCalories(segments, weightKg) : 0),
    [segments, weightKg],
  );

  const avgPaceSecPerKm = totals.distanceM > 0 ? totals.timeSec / (totals.distanceM / 1000) : 0;
  const pointCount = totals.timeSec > 0 ? Math.ceil(totals.timeSec / (parseInt(resolution, 10) || 1)) : 0;

  const durationMismatchPct =
    sensor && sensor.durationSec > 0 && totals.timeSec > 0
      ? (Math.abs(totals.timeSec - sensor.durationSec) / sensor.durationSec) * 100
      : 0;

  /* ---------- block operations ---------- */

  const patchSegment = useCallback((id: number, patch: Partial<SegmentDraft>) => {
    setBlocks((prev) => updateSegmentById(prev, id, patch));
  }, []);

  const patchRepeat = useCallback((id: number, patch: Partial<RepeatDraft>) => {
    setBlocks((prev) => prev.map((b) => (b.kind === 'repeat' && b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const deleteBlock = (id: number) => {
    setBlocks((prev) =>
      prev
        .filter((b) => b.id !== id)
        .map((b) => (b.kind === 'repeat' ? { ...b, children: b.children.filter((c) => c.id !== id) } : b)),
    );
  };

  const moveTopLevel = (id: number, dir: -1 | 1) => {
    setBlocks((prev) => moveInArray(prev, prev.findIndex((b) => b.id === id), dir));
  };

  const moveChild = (parentId: number, childId: number, dir: -1 | 1) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.kind === 'repeat' && b.id === parentId
          ? { ...b, children: moveInArray(b.children, b.children.findIndex((c) => c.id === childId), dir) }
          : b,
      ),
    );
  };

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    if (blocks.length && !window.confirm('Replace the current workout with this template?')) return;
    setBlocks(tpl.build());
  };

  /* ---------- AI: describe the workout in plain language ---------- */

  const handleAiGenerate = async () => {
    const description = aiDescription.trim();
    if (!description || aiLoading) return;
    if (blocks.length && !window.confirm('Replace the current workout with the AI-generated one?')) return;

    setAiLoading(true);
    setAiAssumptions([]);
    try {
      const result = await parseTreadmillWorkout({
        description,
        unit,
        referencePace: aiReferencePace.trim() || undefined,
        referencePaceLabel: aiReferencePace.trim() ? aiReferencePaceLabel.trim() || undefined : undefined,
      });
      setBlocks(result.segments.map((s) => seg({ name: s.name, mode: s.mode, value: s.value, pace: s.pace, incline: String(s.incline) })));
      setAiAssumptions(result.assumptions);
      toast({ title: 'Workout generated', description: result.summary });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not generate workout',
        description: err instanceof Error ? err.message : 'Something went wrong talking to the AI model.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------- unit switch converts displayed values ---------- */

  const handleUnitChange = (next: Unit) => {
    if (next === unit) return;
    const convertSeg = (s: SegmentDraft): SegmentDraft => {
      const out = { ...s };
      const paceSecPerKm = parsePaceToSecPerKm(s.pace, unit);
      if (paceSecPerKm !== null) out.pace = secPerKmToPaceStr(paceSecPerKm, next);
      if (s.mode === 'distance') {
        const m = parseDistanceToMeters(s.value, unit);
        if (m !== null) out.value = metersToDistStr(m, next);
      }
      return out;
    };
    setBlocks((prev) =>
      prev.map((b) =>
        b.kind === 'segment' ? convertSeg(b) : { ...b, children: b.children.map(convertSeg) },
      ),
    );
    setUnit(next);
  };

  /* ---------- sensor file ---------- */

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const track = parseSensorFile(String(reader.result), file.name);
        setSensor(track);
        toast({
          title: 'Watch file attached',
          description: track.hrMin !== null
            ? `Found ${track.count.toLocaleString()} points with heart rate ${track.hrMin}–${track.hrMax} bpm.`
            : `Found ${track.count.toLocaleString()} points, but no heart rate data.`,
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Could not read file',
          description: err instanceof Error ? err.message : 'Not a readable GPX or TCX activity file.',
        });
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFile(e.target.files[0]);
  };

  /* ---------- export ---------- */

  const canExport = blocks.length > 0 && totals.timeSec > 0 && !hasErrors;

  const buildActivityOptions = () => ({
    name: sessionName,
    startTime: startTime ? new Date(startTime) : new Date(),
    segments,
    resolutionSec: parseInt(resolution, 10) || 1,
    startElevationM: parseFloat(startElev) || 0,
    sensor,
    sensorAlign,
    weightKg: weightKg > 0 ? weightKg : null,
    route:
      sessionType === 'outdoor'
        ? {
            lat: clamp(parseFloat(anchorLat), -89, 89, 51.014),
            lon: clamp(parseFloat(anchorLon), -180, 180, -3.0136),
            radiusM: Math.max(5, parseFloat(loopRadius) || 22),
          }
        : null,
  });

  const downloadFile = (data: BlobPart, mime: string, ext: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${(sessionName || 'treadmill-session').trim().replace(/\s+/g, '_').toLowerCase()}_${stamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportFit = async () => {
    if (!canExport || fitExporting) return;
    setFitExporting(true);
    try {
      const bytes = await generateFit({
        ...buildActivityOptions(),
        treadmill: sessionType === 'treadmill',
      });
      // Copy into a fresh Uint8Array so TS sees a plain ArrayBuffer-backed BlobPart
      downloadFile(new Uint8Array(bytes), 'application/octet-stream', 'fit');
      toast({
        title: 'FIT exported',
        description:
          sessionType === 'treadmill'
            ? 'Tagged as Treadmill Running. Upload it at connect.garmin.com via Import Data, or to Strava.'
            : 'Upload it at connect.garmin.com via Import Data, or straight into Strava.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'FIT export failed',
        description: err instanceof Error ? err.message : 'Something went wrong encoding the file.',
      });
    } finally {
      setFitExporting(false);
    }
  };

  const handleExportTcx = () => {
    if (!canExport) return;
    downloadFile(generateTcx(buildActivityOptions()), 'application/vnd.garmin.tcx+xml', 'tcx');
    toast({
      title: 'TCX exported',
      description: 'Upload it at connect.garmin.com via Import Data, or straight into Strava.',
    });
  };

  /* ---------- render ---------- */

  return (
    <div className="space-y-4">
      {/* templates */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={fieldLabelClass}>Start from</span>
        {TEMPLATES.map((t) => (
          <Button key={t.key} type="button" variant="outline" size="sm" onClick={() => applyTemplate(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* AI describe */}
      <Card className="border-accent/50 bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-4 w-4 text-accent" /> Describe it, let AI build it
            <span className="ml-auto rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-body font-semibold normal-case tracking-normal text-accent">
              Powered by Gemini
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder={'e.g. "Treadmill progressive incline. 40 min: start 2%, raise +1% every 5 min up to 8%, then drop back down. Steady RPE — the incline does the work. (RPE 6)"'}
            className="min-h-[84px] bg-background/70 text-sm"
            aria-label="Describe your workout in plain language"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className={fieldLabelClass}>
                Your reference pace /{unit} <span className="normal-case">(optional, grounds RPE/effort language)</span>
              </Label>
              <Input
                value={aiReferencePace}
                onChange={(e) => setAiReferencePace(e.target.value)}
                placeholder="e.g. 6:00"
                className={`mt-1 ${monoInputClass}`}
                aria-label={`Reference pace, minutes per ${unit}`}
              />
            </div>
            <div>
              <Label className={fieldLabelClass}>What that pace is</Label>
              <Input
                value={aiReferencePaceLabel}
                onChange={(e) => setAiReferencePaceLabel(e.target.value)}
                placeholder="e.g. easy pace, 10K pace"
                className="mt-1 bg-background/70"
                aria-label="What the reference pace represents"
                disabled={!aiReferencePace.trim()}
              />
            </div>
          </div>
          <Button type="button" onClick={handleAiGenerate} disabled={!aiDescription.trim() || aiLoading} className="w-full sm:w-auto">
            {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {aiLoading ? 'Building workout…' : 'Generate workout'}
          </Button>
          {aiAssumptions.length > 0 && (
            <div className="rounded-md border border-yellow-600/40 bg-yellow-500/10 p-2.5 text-xs leading-relaxed text-yellow-700 dark:text-yellow-400">
              <p className="mb-1 font-semibold">The AI made some assumptions — review before exporting:</p>
              <ul className="list-inside list-disc space-y-0.5">
                {aiAssumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            AI drafts the segments below into the normal editable builder — nothing exports until you review it.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* -------- builder column -------- */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Workout structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {blocks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing here yet. Pick a starting point above, or add your first segment.
              </p>
            )}
            {blocks.map((block, idx) =>
              block.kind === 'segment' ? (
                <SegmentRow
                  key={block.id}
                  segment={block}
                  unit={unit}
                  isChild={false}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < blocks.length - 1}
                  onPatch={(p) => patchSegment(block.id, p)}
                  onMove={(dir) => moveTopLevel(block.id, dir)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ) : (
                <div key={block.id} className="rounded-lg border border-accent/60 bg-card/60">
                  <div className="flex items-center gap-1 px-3 pt-2.5">
                    <span className="flex items-center gap-1 rounded bg-accent/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      <RepeatIcon className="h-3 w-3" /> Repeat
                    </span>
                    <span className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveTopLevel(block.id, -1)} aria-label="Move repeat block up">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === blocks.length - 1} onClick={() => moveTopLevel(block.id, 1)} aria-label="Move repeat block down">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteBlock(block.id)} aria-label="Remove repeat block">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-4 px-3 py-2">
                    <div className="w-24">
                      <Label className={fieldLabelClass}>Reps</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={block.count}
                        onChange={(e) => {
                          const c = parseInt(e.target.value, 10);
                          patchRepeat(block.id, { count: isNaN(c) || c < 1 ? 1 : Math.min(c, 50) });
                        }}
                        className={`mt-1 ${monoInputClass}`}
                        aria-label="Number of repetitions"
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={block.skipLastRest}
                        onCheckedChange={(v) => patchRepeat(block.id, { skipLastRest: v === true })}
                      />
                      Skip last step on final rep
                    </label>
                  </div>
                  <div className="ml-3 space-y-2 border-l-2 border-accent py-1 pl-3 pr-3">
                    {block.children.map((child, cIdx) => (
                      <SegmentRow
                        key={child.id}
                        segment={child}
                        unit={unit}
                        isChild
                        canMoveUp={cIdx > 0}
                        canMoveDown={cIdx < block.children.length - 1}
                        onPatch={(p) => patchSegment(child.id, p)}
                        onMove={(dir) => moveChild(block.id, child.id, dir)}
                        onDelete={() => deleteBlock(child.id)}
                      />
                    ))}
                  </div>
                  <div className="px-3 pb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patchRepeat(block.id, { children: [...block.children, seg({ name: 'Step' })] })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Step
                    </Button>
                  </div>
                </div>
              ),
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setBlocks((prev) => [...prev, seg({ name: `Segment ${prev.length + 1}` })])}>
                <Plus className="mr-1 h-4 w-4" /> Segment
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setBlocks((prev) => [
                    ...prev,
                    rep(
                      [seg({ name: 'Work', pace: '4:30', value: '2:00' }), seg({ name: 'Recovery', pace: '7:30', value: '1:00' })],
                      4,
                      true,
                    ),
                  ])
                }
              >
                <RepeatIcon className="mr-1 h-4 w-4" /> Repeat block
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* -------- side column -------- */}
        <div className="space-y-4 lg:sticky lg:top-4">
          {/* profile */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Session profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60">
                <StatTile label="Time" value={totals.timeSec > 0 ? fmtHMS(totals.timeSec) : '0:00'} />
                <StatTile label="Distance" value={metersToDistStr(totals.distanceM || 0, unit)} suffix={` ${unit}`} />
                <StatTile
                  label="Avg pace"
                  value={totals.distanceM > 0 ? secPerKmToPaceStr(avgPaceSecPerKm, unit) : '–'}
                  suffix={totals.distanceM > 0 ? ` /${unit}` : ''}
                />
                <StatTile label="Climb" value={String(Math.round(totals.climbM))} suffix=" m" />
              </div>
              {weightKg > 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  &asymp; {calories.toLocaleString()} kcal (ACSM estimate at {weightKg} kg)
                </p>
              )}

              <EffortChart segments={segments} totals={totals} unit={unit} />

              {segments.length > 0 && (
                <div>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowSplits((v) => !v)}>
                    {showSplits ? 'Hide' : 'Show'} lap splits ({segments.length})
                  </Button>
                  {showSplits && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border/60">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8 text-xs">Lap</TableHead>
                            <TableHead className="h-8 text-right text-xs">Time</TableHead>
                            <TableHead className="h-8 text-right text-xs">{unit}</TableHead>
                            <TableHead className="h-8 text-right text-xs">Pace</TableHead>
                            <TableHead className="h-8 text-right text-xs">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {segments.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell className="py-1.5 text-xs">{s.name}</TableCell>
                              <TableCell className="py-1.5 text-right font-mono text-xs">{fmtMinSec(s.timeSec)}</TableCell>
                              <TableCell className="py-1.5 text-right font-mono text-xs">{metersToDistStr(s.distanceM, unit)}</TableCell>
                              <TableCell className="py-1.5 text-right font-mono text-xs">{secPerKmToPaceStr(1000 / s.speedMps, unit)}</TableCell>
                              <TableCell className="py-1.5 text-right font-mono text-xs">{s.incline}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              <Button type="button" className="w-full py-6 text-base font-headline" disabled={!canExport || fitExporting} onClick={handleExportFit}>
                {fitExporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />} Export FIT
                <span className="ml-2 rounded bg-background/20 px-1.5 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wider">recommended</span>
              </Button>
              <Button type="button" variant="outline" className="w-full font-headline" disabled={!canExport} onClick={handleExportTcx}>
                <Download className="mr-2 h-4 w-4" /> Export TCX
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                FIT imports into Garmin Connect as <em>Treadmill Running</em> automatically and is the most reliable
                format. Use TCX only for platforms that can&apos;t read FIT.
              </p>
              <p className="text-center font-mono text-xs text-muted-foreground">
                {!blocks.length || totals.timeSec <= 0
                  ? 'Add at least one segment'
                  : hasErrors
                    ? 'Fix the highlighted fields'
                    : `Ready · ${pointCount.toLocaleString()} points${sensor ? ' · HR from watch file' : ''}`}
              </p>
              {sensor && durationMismatchPct > 15 && sensorAlign === 'stretch' && (
                <p className="rounded-md border border-yellow-600/40 bg-yellow-500/10 p-2.5 text-xs leading-relaxed text-yellow-700 dark:text-yellow-400">
                  This workout ({fmtHMS(totals.timeSec)}) differs from the attached file ({fmtHMS(sensor.durationSec)}) by{' '}
                  {durationMismatchPct.toFixed(0)}%. Heart rate will be stretched or compressed to fit — switch to
                  &ldquo;real time&rdquo; alignment below if the recording actually started with the workout.
                </p>
              )}
            </CardContent>
          </Card>

          {/* attach */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <FileHeart className="h-4 w-4" /> Keep your heart rate
                <span className="font-normal normal-case tracking-normal">(optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!sensor ? (
                <label
                  className={`block cursor-pointer rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted-foreground transition-colors ${
                    dragOver ? 'border-primary bg-accent/10' : 'border-border/70 hover:border-primary'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                  }}
                  onDrop={onDrop}
                >
                  <input ref={fileInputRef} type="file" accept=".gpx,.tcx" className="hidden" onChange={onFileChange} />
                  <UploadCloud className="mx-auto mb-1.5 h-5 w-5" />
                  <span className="font-semibold text-foreground">Attach the file your watch recorded</span>
                  <br />
                  GPX or TCX — heart rate &amp; cadence are lifted out and re-timed onto your rebuilt session.
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-primary/40 px-2 py-1 font-mono text-[11px]">{sensor.fileName}</span>
                    <span className="rounded border border-border/70 px-2 py-1 font-mono text-[11px]">{fmtHMS(sensor.durationSec)}</span>
                    <span className="rounded border border-border/70 px-2 py-1 font-mono text-[11px]">{sensor.count.toLocaleString()} pts</span>
                    <span className="rounded border border-border/70 px-2 py-1 font-mono text-[11px]">
                      {sensor.hrMin !== null ? `HR ${sensor.hrMin}–${sensor.hrMax}` : 'no HR found'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setSensor(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  </div>
                  <div>
                    <Label className={fieldLabelClass}>Align sensor data</Label>
                    <Select value={sensorAlign} onValueChange={(v) => setSensorAlign(v as SensorAlign)}>
                      <SelectTrigger className="mt-1 bg-background/70" aria-label="Sensor alignment mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stretch">Stretch to fit the workout</SelectItem>
                        <SelectItem value="realtime">Real time (1:1 from the start)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The route and pace in the attached file are ignored — only the heart rate and cadence stream
                    survives.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* session details */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Session details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="tcx-name" className={fieldLabelClass}>Name</Label>
                <Input id="tcx-name" value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="mt-1 bg-background/70" />
              </div>
              <div>
                <Label className={fieldLabelClass}>Session type</Label>
                <div className="mt-1 grid grid-cols-2 gap-1 rounded-md border border-border/70 p-1">
                  {(['treadmill', 'outdoor'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={sessionType === t ? 'default' : 'ghost'}
                      onClick={() => setSessionType(t)}
                    >
                      {t === 'treadmill' ? 'Treadmill' : 'Outdoor (GPS)'}
                    </Button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  FIT exports are tagged as treadmill running natively. For TCX, Garmin infers indoor vs outdoor
                  from whether GPS points are present — this choice controls both.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tcx-start" className={fieldLabelClass}>Start time</Label>
                  <Input id="tcx-start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 bg-background/70" />
                </div>
                <div>
                  <Label className={fieldLabelClass}>Units</Label>
                  <Select value={unit} onValueChange={(v) => handleUnitChange(v as Unit)}>
                    <SelectTrigger className="mt-1 bg-background/70" aria-label="Units">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">km</SelectItem>
                      <SelectItem value="mi">miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tcx-weight" className={fieldLabelClass}>Weight kg <span className="normal-case">(for calories)</span></Label>
                  <Input id="tcx-weight" type="number" min="0" step="0.5" placeholder="optional" value={weight} onChange={(e) => setWeight(e.target.value)} className={`mt-1 ${monoInputClass}`} />
                </div>
                <div>
                  <Label className={fieldLabelClass}>Point every</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="mt-1 bg-background/70" aria-label="Trackpoint resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 sec</SelectItem>
                      <SelectItem value="2">2 sec</SelectItem>
                      <SelectItem value="5">5 sec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tcx-elev" className={fieldLabelClass}>Start elevation m</Label>
                  <Input id="tcx-elev" type="number" step="1" value={startElev} onChange={(e) => setStartElev(e.target.value)} className={`mt-1 ${monoInputClass}`} />
                </div>
              </div>
              {sessionType === 'outdoor' && (
                <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
                  <div>
                    <Label htmlFor="tcx-lat" className={fieldLabelClass}>Anchor lat</Label>
                    <Input id="tcx-lat" value={anchorLat} onChange={(e) => setAnchorLat(e.target.value)} className={`mt-1 ${monoInputClass}`} />
                  </div>
                  <div>
                    <Label htmlFor="tcx-lon" className={fieldLabelClass}>Anchor lon</Label>
                    <Input id="tcx-lon" value={anchorLon} onChange={(e) => setAnchorLon(e.target.value)} className={`mt-1 ${monoInputClass}`} />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="tcx-radius" className={fieldLabelClass}>Loop radius m</Label>
                    <Input id="tcx-radius" type="number" min="5" step="1" value={loopRadius} onChange={(e) => setLoopRadius(e.target.value)} className={`mt-1 ${monoInputClass}`} />
                  </div>
                  <p className="col-span-2 text-xs leading-relaxed text-muted-foreground">
                    Draws a small looping path at the anchor point so the activity shows a map. Distance and pace come
                    from the workout itself either way.
                  </p>
                </div>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                The builder and file export run entirely in your browser — your workout and any attached file never
                leave this page (the AI &ldquo;describe it&rdquo; box is the one exception: that text is sent to
                Gemini to generate segments). Your draft is autosaved locally.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-headline text-xl font-bold">
        {value}
        {suffix && <span className="font-mono text-xs font-medium text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number, fallback: number): number {
  if (isNaN(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}
