
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

export default function PercentageBasedWeightCalculatorForm() {
  const [oneRepMax, setOneRepMax] = useState('');
  const [percentage, setPercentage] = useState('');
  
  const [calculatedWeight, setCalculatedWeight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  useEffect(() => {
    setError(null);
    setCalculatedWeight(null);
  }, [oneRepMax, percentage]);

  const calculateWeight = (orm: number, perc: number): number | string => {
    if (orm <= 0) {
      return "1RM must be a positive number.";
    }
    if (perc < 0 || perc > 200) { // Allow >100% for supramaximal or variations
      return "Percentage should ideally be between 0 and 200.";
    }
    const weight = (orm * perc) / 100;
    return parseFloat(weight.toFixed(2)); // Round to 2 decimal places
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCalculatedWeight(null);
    setIsCalculating(true);


    const oneRepMaxNum = parseFloat(oneRepMax);
    const percentageNum = parseFloat(percentage);

    if (isNaN(oneRepMaxNum)) {
      setError('Please enter a valid 1RM.');
      setIsCalculating(false);
      return;
    }
    if (isNaN(percentageNum)) {
      setError('Please enter a valid percentage.');
      setIsCalculating(false);
      return;
    }

    const result = calculateWeight(oneRepMaxNum, percentageNum);

    if (typeof result === 'number') {
      setCalculatedWeight(`${result}`);
    } else {
      setError(result); // result is an error message string
    }
    setIsCalculating(false);
  };

  const handleClear = () => {
    setOneRepMax('');
    setPercentage('');
    setCalculatedWeight(null);
    setError(null);
    setIsCalculating(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <Label htmlFor="oneRepMax" className="text-sm font-medium">Your 1RM (One-Rep Max)</Label>
          <Input
            id="oneRepMax"
            type="number"
            value={oneRepMax}
            onChange={(e) => setOneRepMax(e.target.value)}
            placeholder="e.g., 100"
            className={`${inputBaseClass} mt-1`}
            min="0.1"
            step="0.1"
            required
          />
           <p className="text-xs text-muted-foreground mt-1">Enter your current 1RM for the lift (e.g., kg or lbs).</p>
        </div>
        <div>
          <Label htmlFor="percentage" className="text-sm font-medium">Desired Percentage (%)</Label>
          <Input
            id="percentage"
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="e.g., 75"
            className={`${inputBaseClass} mt-1`}
            min="0"
            step="0.1"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Enter the percentage of your 1RM you want to calculate.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button type="submit" className="w-full sm:w-auto flex-grow bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3" disabled={isCalculating}>
          {isCalculating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Calculating...
            </>
          ) : (
            <>
              <Target className="mr-2 h-5 w-5" /> Calculate Weight
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

      {calculatedWeight && (
        <Card className="mt-6 shadow-md border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-4 text-center">
            <CardTitle className="text-xl md:text-2xl font-semibold text-primary flex items-center justify-center">
              <TrendingUp className="mr-2 h-6 w-6 text-accent-ink" /> Weight to Lift
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-4">
            <p className="text-3xl md:text-4xl font-bold text-accent-ink">{calculatedWeight}</p>
            <p className="text-xs text-muted-foreground mt-2">
              This is {percentage}% of your 1RM ({oneRepMax}). Ensure you use the same unit (kg/lbs) as your 1RM input.
            </p>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
