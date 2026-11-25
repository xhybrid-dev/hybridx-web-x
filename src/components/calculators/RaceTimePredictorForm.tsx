
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

type UnitOption = 'km' | 'miles';

const RIEGL_EXPONENT = 1.06;
const KM_IN_MILES = 1.60934;

interface RaceDefinition {
  name: string;
  km: number;
  miles: number;
}

const TARGET_RACES: RaceDefinition[] = [
  { name: '5K', km: 5, miles: 5 / KM_IN_MILES },
  { name: '10K', km: 10, miles: 10 / KM_IN_MILES },
  { name: 'Half Marathon', km: 21.0975, miles: 21.0975 / KM_IN_MILES },
  { name: 'Marathon', km: 42.195, miles: 42.195 / KM_IN_MILES },
];

interface Prediction {
  name: string;
  predictedTime: string;
  distanceDisplay: string;
}

export default function RaceTimePredictorForm() {
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<UnitOption>('km');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setError(null);
    setPredictions(null);
  }, [distance, unit, hours, minutes, seconds]);
  
  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  const parseTimeToSeconds = (h: string, m: string, s: string): number => {
    return (parseInt(h, 10) || 0) * 3600 + (parseInt(m, 10) || 0) * 60 + (parseFloat(s) || 0);
  };

  const formatSecondsToTime = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handlePredict = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPredictions(null);
    setIsCalculating(true);

    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate calculation time

    const distNum = parseFloat(distance);
    if (isNaN(distNum) || distNum <= 0) {
      setError('Please enter a valid distance for your recent race.');
      setIsCalculating(false);
      return;
    }

    const t1Seconds = parseTimeToSeconds(hours, minutes, seconds);
    if (t1Seconds <= 0) {
      setError('Please enter a valid time for your recent race.');
      setIsCalculating(false);
      return;
    }

    const d1Km = unit === 'km' ? distNum : distNum * KM_IN_MILES;

    const newPredictions: Prediction[] = TARGET_RACES.map(targetRace => {
      const d2Km = targetRace.km;
      let t2Seconds: number;

      if (d1Km === d2Km) {
        t2Seconds = t1Seconds; // If predicting for the same distance, use the input time
      } else {
        t2Seconds = t1Seconds * Math.pow(d2Km / d1Km, RIEGL_EXPONENT);
      }
      
      const predictedTimeFormatted = formatSecondsToTime(t2Seconds);
      const distanceDisplay = unit === 'km' 
        ? `${targetRace.km.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} km` 
        : `${targetRace.miles.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} miles`;

      return {
        name: targetRace.name,
        predictedTime: predictedTimeFormatted,
        distanceDisplay,
      };
    });

    setPredictions(newPredictions);
    setIsCalculating(false);
  };

  const handleClear = () => {
    setDistance('');
    setHours('');
    setMinutes('');
    setSeconds('');
    setUnit('km');
    setPredictions(null);
    setError(null);
    setIsCalculating(false);
  };

  return (
    <form onSubmit={handlePredict} className="space-y-6 md:space-y-8 font-body">
      <div className="p-4 border border-primary/20 rounded-lg bg-primary/5 space-y-4">
        <h3 className="text-lg font-medium text-primary mb-2">Your Recent Race</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="distance" className="text-sm font-medium">Distance</Label>
            <Input
              id="distance"
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g., 10"
              className={`${inputBaseClass} mt-1`}
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <div>
            <Label htmlFor="unit" className="text-sm font-medium">Unit</Label>
            <Select value={unit} onValueChange={(value) => setUnit(value as UnitOption)}>
              <SelectTrigger id="unit" className={`${inputBaseClass} mt-1`}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers (km)</SelectItem>
                <SelectItem value="miles">Miles (mi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Time Taken (HH:MM:SS)</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <Input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="HH"
              className={inputBaseClass}
              min="0"
            />
            <Input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="MM"
              className={inputBaseClass}
              min="0" max="59"
              required={!hours && !seconds}
            />
            <Input
              type="number"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="SS"
              className={inputBaseClass}
              min="0" max="59.99" step="0.01"
              required={!hours && !minutes}
            />
          </div>
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
              <TrendingUp className="mr-2 h-5 w-5" /> Predict Times
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

      {predictions && (
        <div className="mt-6 space-y-4">
          <h3 className="text-xl md:text-2xl font-semibold text-primary text-center">Predicted Race Times</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {predictions.map((pred) => (
              <Card key={pred.name} className="bg-card/80 backdrop-blur-sm shadow-md border-border/50">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-lg font-headline text-accent-ink flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                    {pred.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-4">
                  <p className="text-2xl font-semibold text-foreground">{pred.predictedTime}</p>
                  <p className="text-sm text-muted-foreground">({pred.distanceDisplay})</p>
                </CardContent>
              </Card>
            ))}
          </div>
           <p className="text-xs text-muted-foreground text-center pt-2">
            Note: Predictions are estimates based on Riegel's model. Actual performance may vary due to training, course conditions, weather, and other factors.
          </p>
        </div>
      )}
    </form>
  );
}
