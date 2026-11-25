
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, RefreshCw, AlertTriangle, Trophy, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { KG_PER_LB, powerliftingScore, type ScoreResult } from '@/lib/calculators/powerlifting';

type GenderOption = 'male' | 'female';
type UnitOption = 'kg' | 'lbs';
type FormulaOption = 'wilks' | 'dots';

export default function PowerliftingScoreCalculatorForm() {
  const [gender, setGender] = useState<GenderOption>('male');
  const [bodyweight, setBodyweight] = useState('');
  const [bodyweightUnit, setBodyweightUnit] = useState<UnitOption>('kg');
  const [squat, setSquat] = useState('');
  const [bench, setBench] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [liftsUnit, setLiftsUnit] = useState<UnitOption>('kg');
  const [formula, setFormula] = useState<FormulaOption>('dots'); // Default to DOTS as it's newer
  
  const [calculatedScore, setCalculatedScore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  useEffect(() => {
    setError(null);
    setCalculatedScore(null);
  }, [gender, bodyweight, bodyweightUnit, squat, bench, deadlift, liftsUnit, formula]);

  const convertToKg = (value: number, unit: UnitOption): number => {
    return unit === 'lbs' ? value * KG_PER_LB : value;
  };

  const calculateScore = (): ScoreResult => {
    const bwNum = parseFloat(bodyweight);
    const squatNum = parseFloat(squat);
    const benchNum = parseFloat(bench);
    const deadliftNum = parseFloat(deadlift);

    if (isNaN(bwNum) || bwNum <= 0) return { ok: false, message: 'Invalid bodyweight.' };
    if (isNaN(squatNum) || squatNum < 0) return { ok: false, message: 'Invalid squat value.' }; // Lifts can be 0
    if (isNaN(benchNum) || benchNum < 0) return { ok: false, message: 'Invalid bench press value.' };
    if (isNaN(deadliftNum) || deadliftNum < 0) return { ok: false, message: 'Invalid deadlift value.' };

    return powerliftingScore({
      sex: gender,
      formula,
      bodyweightKg: convertToKg(bwNum, bodyweightUnit),
      totalKg: convertToKg(squatNum + benchNum + deadliftNum, liftsUnit),
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCalculatedScore(null);
    setIsCalculating(true);

    const result = calculateScore();
    if (result.ok) {
      setCalculatedScore(`${result.points.toFixed(2)} ${formula.toUpperCase()} Points`);
    } else {
      setError(result.message);
    }
    setIsCalculating(false);
  };

  const handleClear = () => {
    setGender('male');
    setBodyweight('');
    setBodyweightUnit('kg');
    setSquat('');
    setBench('');
    setDeadlift('');
    setLiftsUnit('kg');
    setFormula('dots');
    setCalculatedScore(null);
    setError(null);
    setIsCalculating(false);
  };

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
          <Select value={gender} onValueChange={(value) => setGender(value as GenderOption)}>
            <SelectTrigger id="gender" className={`${inputBaseClass} mt-1`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-x-2">
            <div>
            <Label htmlFor="bodyweight" className="text-sm font-medium">Bodyweight</Label>
            <Input
                id="bodyweight" type="number" value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                placeholder="e.g., 75" className={`${inputBaseClass} mt-1`}
                min="1" step="0.1" required
            />
            </div>
            <div>
            <Label htmlFor="bodyweightUnit" className="text-sm font-medium">Unit</Label>
            <Select value={bodyweightUnit} onValueChange={(value) => setBodyweightUnit(value as UnitOption)}>
                <SelectTrigger id="bodyweightUnit" className={`${inputBaseClass} mt-1`}>
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
                </SelectContent>
            </Select>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-md font-medium text-primary">Lifts</h3>
            <div>
            <Label htmlFor="liftsUnit" className="text-sm font-medium sr-only">Lifts Unit</Label>
            <Select value={liftsUnit} onValueChange={(value) => setLiftsUnit(value as UnitOption)}>
                <SelectTrigger id="liftsUnit" className={`${inputBaseClass} h-9 w-[80px]`}>
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
                </SelectContent>
            </Select>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
          <div>
            <Label htmlFor="squat" className="text-sm font-medium">Squat ({liftsUnit})</Label>
            <Input id="squat" type="number" value={squat} onChange={(e) => setSquat(e.target.value)} placeholder="e.g., 150" className={`${inputBaseClass} mt-1`} min="0" step="0.1" required/>
          </div>
          <div>
            <Label htmlFor="bench" className="text-sm font-medium">Bench Press ({liftsUnit})</Label>
            <Input id="bench" type="number" value={bench} onChange={(e) => setBench(e.target.value)} placeholder="e.g., 100" className={`${inputBaseClass} mt-1`} min="0" step="0.1" required/>
          </div>
          <div>
            <Label htmlFor="deadlift" className="text-sm font-medium">Deadlift ({liftsUnit})</Label>
            <Input id="deadlift" type="number" value={deadlift} onChange={(e) => setDeadlift(e.target.value)} placeholder="e.g., 200" className={`${inputBaseClass} mt-1`} min="0" step="0.1" required/>
          </div>
        </div>
      </div>
      
      <div>
        <Label className="text-sm font-medium">Formula</Label>
        <RadioGroup value={formula} onValueChange={(value) => setFormula(value as FormulaOption)} className="mt-2 grid grid-cols-2 gap-4">
            <div>
                <RadioGroupItem value="wilks" id="wilks" className="peer sr-only" />
                <Label htmlFor="wilks" className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${formula === 'wilks' ? 'border-primary ring-2 ring-primary' : 'border-muted bg-popover'}`}>
                Wilks
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild><Button type="button" aria-label="More information" variant="ghost" size="icon" className="h-5 w-5 mt-1 text-muted-foreground hover:text-primary"><Info size={14}/></Button></TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs" side="bottom"><p>The original Wilks formula, widely used for many years.</p></TooltipContent>
                </Tooltip>
                </Label>
            </div>
            <div>
                <RadioGroupItem value="dots" id="dots" className="peer sr-only" />
                <Label htmlFor="dots" className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${formula === 'dots' ? 'border-primary ring-2 ring-primary' : 'border-muted bg-popover'}`}>
                DOTS
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild><Button type="button" aria-label="More information" variant="ghost" size="icon" className="h-5 w-5 mt-1 text-muted-foreground hover:text-primary"><Info size={14}/></Button></TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs" side="bottom"><p>Dynamic Objective Team Scoring, a newer formula that has largely replaced Wilks in powerlifting meets.</p></TooltipContent>
                </Tooltip>
                </Label>
            </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground mt-2">Note: IPF GL Points are more complex and not included here. Consult official IPF resources for GL Points.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button type="submit" className="w-full sm:w-auto flex-grow bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3" disabled={isCalculating}>
          {isCalculating ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Calculator className="mr-2 h-5 w-5" />}
          Calculate Score
        </Button>
        <Button type="button" variant="outline" onClick={handleClear} className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 text-base py-3" disabled={isCalculating}>
          <RefreshCw className="mr-2 h-5 w-5" /> Clear
        </Button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-center flex items-center justify-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
          <p className="font-medium text-destructive">{error}</p>
        </div>
      )}

      {calculatedScore && (
        <Card className="mt-6 shadow-md border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-4 text-center">
            <CardTitle className="text-xl md:text-2xl font-semibold text-primary flex items-center justify-center">
              <Trophy className="mr-2 h-6 w-6 text-accent-ink" /> Calculated Score
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-4">
            <p className="text-3xl md:text-4xl font-bold text-accent-ink">{calculatedScore}</p>
            <p className="text-xs text-muted-foreground mt-2">
              This score allows comparison of strength across different bodyweights using the selected formula.
            </p>
          </CardContent>
        </Card>
      )}
    </form>
    </TooltipProvider>
  );
}
