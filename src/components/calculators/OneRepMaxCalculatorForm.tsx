
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, RefreshCw, AlertTriangle, Weight } from 'lucide-react';

type FormulaOption = 'epley' | 'brzycki';

export default function OneRepMaxCalculatorForm() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [formula, setFormula] = useState<FormulaOption>('epley');
  
  const [estimated1RM, setEstimated1RM] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  useEffect(() => {
    setError(null);
    setEstimated1RM(null);
  }, [weight, reps, formula]);

  const calculate1RM = (w: number, r: number, f: FormulaOption): number | string => {
    if (w <= 0) {
      return "Weight must be positive.";
    }
    if (r <= 0) {
      return "Repetitions must be positive.";
    }
    if (r === 1) {
      return w; // If 1 rep is performed, 1RM is the weight lifted.
    }

    let rm;
    if (f === 'epley') {
      // Epley formula: 1RM = Weight * (1 + Reps / 30)
      // Generally suitable for 1-12 reps.
      rm = w * (1 + r / 30);
    } else if (f === 'brzycki') {
      // Brzycki formula: 1RM = Weight / (1.0278 - 0.0278 * Reps)
      // Generally suitable for 1-10 reps.
      // Formula can lead to division by zero or negative if reps are too high (approx > 36).
      const divisor = 1.0278 - 0.0278 * r;
      if (divisor <= 0) {
        return "Calculation error with Brzycki formula for this number of reps. Try fewer reps or Epley formula.";
      }
      rm = w / divisor;
    } else {
        return "Invalid formula selected.";
    }
    return parseFloat(rm.toFixed(2));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEstimated1RM(null);
    setIsCalculating(true);


    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps, 10);

    if (isNaN(weightNum)) {
      setError('Please enter a valid weight.');
      setIsCalculating(false);
      return;
    }
    if (isNaN(repsNum)) {
      setError('Please enter a valid number of repetitions.');
      setIsCalculating(false);
      return;
    }
    if (!formula) {
        setError('Please select a formula.');
        setIsCalculating(false);
        return;
    }

    const result = calculate1RM(weightNum, repsNum, formula);

    if (typeof result === 'number') {
      setEstimated1RM(`${result} (based on ${formula.charAt(0).toUpperCase() + formula.slice(1)})`);
    } else {
      setError(result); // result is an error message string
    }
    setIsCalculating(false);
  };

  const handleClear = () => {
    setWeight('');
    setReps('');
    setFormula('epley');
    setEstimated1RM(null);
    setError(null);
    setIsCalculating(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <Label htmlFor="weight" className="text-sm font-medium">Weight Lifted</Label>
          <Input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g., 100"
            className={`${inputBaseClass} mt-1`}
            min="0.1"
            step="0.1"
            required
          />
           <p className="text-xs text-muted-foreground mt-1">Enter the weight (e.g., kg or lbs).</p>
        </div>
        <div>
          <Label htmlFor="reps" className="text-sm font-medium">Repetitions Performed</Label>
          <Input
            id="reps"
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="e.g., 5"
            className={`${inputBaseClass} mt-1`}
            min="1"
            step="1"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Number of successful repetitions (1-12 for best accuracy).</p>
        </div>
      </div>

      <div>
        <Label htmlFor="formula" className="text-sm font-medium">Formula</Label>
        <Select value={formula} onValueChange={(value) => setFormula(value as FormulaOption)}>
          <SelectTrigger id="formula" className={`${inputBaseClass} mt-1`}>
            <SelectValue placeholder="Select formula" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="epley">Epley Formula</SelectItem>
            <SelectItem value="brzycki">Brzycki Formula</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">Different formulas provide slightly different estimates. Epley is common for lower reps, Brzycki for a broader range up to 10-12 reps.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button type="submit" className="w-full sm:w-auto flex-grow bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3" disabled={isCalculating}>
          {isCalculating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Calculating...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-5 w-5" /> Calculate 1RM
            </>
          )}
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

      {estimated1RM && (
        <Card className="mt-6 shadow-md border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-4 text-center">
            <CardTitle className="text-xl md:text-2xl font-semibold text-primary flex items-center justify-center">
              <Weight className="mr-2 h-6 w-6 text-accent-ink" /> Estimated One-Rep Max (1RM)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-4">
            <p className="text-3xl md:text-4xl font-bold text-accent-ink">{estimated1RM}</p>
            <p className="text-xs text-muted-foreground mt-2">
              This is an estimate. Actual 1RM can vary based on factors like fatigue, technique, and daily readiness.
              The formulas are most accurate for repetitions between 2 and 10-12. If you entered 1 rep, the 1RM is the weight you lifted.
            </p>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
