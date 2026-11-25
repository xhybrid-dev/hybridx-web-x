
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HeartPulse, RefreshCw, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface Zone {
  name: string;
  percentage: string;
  hrRange: string;
  description: string;
  color: string;
}

const zoneDefinitions = [
  { name: 'Zone 1: Very Light', low: 0.50, high: 0.60, description: 'Recovery, light activity. Improves overall health.', color: 'bg-blue-500/20 border-blue-500 text-blue-300' },
  { name: 'Zone 2: Light', low: 0.60, high: 0.70, description: 'Basic endurance, fat burning. Builds aerobic base.', color: 'bg-green-500/20 border-green-500 text-green-300' },
  { name: 'Zone 3: Moderate', low: 0.70, high: 0.80, description: 'Aerobic fitness. Improves cardiovascular efficiency.', color: 'bg-yellow-500/20 border-yellow-500 text-yellow-300' },
  { name: 'Zone 4: Hard', low: 0.80, high: 0.90, description: 'Anaerobic threshold. Increases lactate threshold.', color: 'bg-orange-500/20 border-orange-500 text-orange-300' },
  { name: 'Zone 5: Very Hard', low: 0.90, high: 1.00, description: 'Maximal effort. Develops peak performance and VO2 max.', color: 'bg-red-500/20 border-red-500 text-red-300' },
];


export default function HeartRateZoneCalculatorForm() {
  const [age, setAge] = useState('');
  const [restingHR, setRestingHR] = useState('');
  const [maxHR, setMaxHR] = useState('');
  const [vo2Max, setVo2Max] = useState(''); // Input for VO2max, not used in current calculation logic

  const [zones, setZones] = useState<Zone[] | null>(null);
  const [calculatedMhr, setCalculatedMhr] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  useEffect(() => {
    setError(null);
    setZones(null);
    setCalculatedMhr(null);
  }, [age, restingHR, maxHR, vo2Max]);

  const calculateHeartRateZones = (
    currentAge: number,
    currentRhr: number,
    currentMhr?: number
  ): { mhr: number; calculatedZones: Zone[] } | null => {
    const mhrToUse = currentMhr || (220 - currentAge);
    if (mhrToUse <= 0 || currentRhr <=0 || mhrToUse <= currentRhr) {
        setError('Max Heart Rate must be greater than Resting Heart Rate and both must be positive.');
        return null;
    }

    const hrr = mhrToUse - currentRhr; // Heart Rate Reserve

    const calculatedZones = zoneDefinitions.map(zoneDef => {
      const lowerBound = Math.round(hrr * zoneDef.low + currentRhr);
      const upperBound = Math.round(hrr * zoneDef.high + currentRhr);
      return {
        name: zoneDef.name,
        percentage: `${Math.round(zoneDef.low * 100)}% - ${Math.round(zoneDef.high * 100)}% HRR`,
        hrRange: `${lowerBound} - ${upperBound} bpm`,
        description: zoneDef.description,
        color: zoneDef.color
      };
    });
    
    return { mhr: mhrToUse, calculatedZones };
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setZones(null);
    setCalculatedMhr(null);
    setIsCalculating(true);


    const ageNum = parseInt(age, 10);
    const rhrNum = parseInt(restingHR, 10);
    const mhrNum = maxHR ? parseInt(maxHR, 10) : undefined;
    // const vo2MaxNum = vo2Max ? parseFloat(vo2Max) : undefined; // Parsed but not used yet

    if (isNaN(ageNum) || ageNum <= 0) {
      setError('Please enter a valid age.');
      setIsCalculating(false);
      return;
    }
    if (isNaN(rhrNum) || rhrNum <= 0) {
      setError('Please enter a valid resting heart rate.');
      setIsCalculating(false);
      return;
    }
    if (mhrNum !== undefined && (isNaN(mhrNum) || mhrNum <= 0)) {
        setError('If providing Max Heart Rate, please enter a valid number.');
        setIsCalculating(false);
        return;
    }
    
    const result = calculateHeartRateZones(ageNum, rhrNum, mhrNum);

    if (result) {
        setCalculatedMhr(result.mhr);
        setZones(result.calculatedZones);
    }
    setIsCalculating(false);
  };

  const handleClear = () => {
    setAge('');
    setRestingHR('');
    setMaxHR('');
    setVo2Max('');
    setZones(null);
    setError(null);
    setCalculatedMhr(null);
    setIsCalculating(false);
  };

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <Label htmlFor="age" className="text-sm font-medium flex items-center">
            Age (Years) <span className="text-destructive ml-1">*</span>
             <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"><Info size={16}/></Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border-border shadow-lg" side="top">
                    <p>Your current age in years. Used to estimate Max Heart Rate if not provided.</p>
                </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g., 30"
            className={`${inputBaseClass} mt-1`}
            required
            min="1"
          />
        </div>
        <div>
          <Label htmlFor="restingHR" className="text-sm font-medium flex items-center">
            Resting Heart Rate (bpm) <span className="text-destructive ml-1">*</span>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"><Info size={16}/></Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border-border shadow-lg" side="top">
                    <p>Your heart rate at complete rest, usually measured in the morning. Average is 60-80 bpm.</p>
                </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            id="restingHR"
            type="number"
            value={restingHR}
            onChange={(e) => setRestingHR(e.target.value)}
            placeholder="e.g., 60"
            className={`${inputBaseClass} mt-1`}
            required
            min="30"
          />
        </div>
        <div>
          <Label htmlFor="maxHR" className="text-sm font-medium flex items-center">
            Max Heart Rate (bpm) (Optional)
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"><Info size={16}/></Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border-border shadow-lg" side="top">
                    <p>Your highest achieved heart rate. If unknown, it will be estimated as 220 - Age.</p>
                </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            id="maxHR"
            type="number"
            value={maxHR}
            onChange={(e) => setMaxHR(e.target.value)}
            placeholder="e.g., 190 or leave blank"
            className={`${inputBaseClass} mt-1`}
             min="100"
          />
        </div>
        <div>
           <Label htmlFor="vo2Max" className="text-sm font-medium flex items-center">
            VO2 Max (ml/kg/min) (Optional)
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"><Info size={16}/></Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border-border shadow-lg" side="top">
                    <p>Your maximal oxygen uptake. Currently for informational input, not used in standard Karvonen calculation.</p>
                </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            id="vo2Max"
            type="number"
            step="0.1"
            value={vo2Max}
            onChange={(e) => setVo2Max(e.target.value)}
            placeholder="e.g., 45.5"
            className={`${inputBaseClass} mt-1`}
          />
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
              <HeartPulse className="mr-2 h-5 w-5" /> Calculate Zones
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

      {calculatedMhr && (
        <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
          <p className="text-md font-medium text-primary">
            {maxHR ? "Using Your Max Heart Rate: " : "Estimated Max Heart Rate: "} 
            <span className="font-bold">{calculatedMhr} bpm</span>
          </p>
           {!maxHR && <p className="text-xs text-muted-foreground">(Based on 220 - Age formula)</p>}
        </div>
      )}

      {zones && (
        <div className="mt-6 space-y-3">
          <h3 className="text-xl md:text-2xl font-semibold text-primary text-center mb-4">Your Training Heart Rate Zones</h3>
          {zones.map((zone) => (
            <Card key={zone.name} className={`shadow-md border-l-4 ${zone.color.split(' ')[1]} ${zone.color.split(' ')[0]}`}>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className={`text-md font-headline ${zone.color.split(' ')[2]}`}>{zone.name}</CardTitle>
                 <p className={`text-xs font-mono ${zone.color.split(' ')[2]}/80`}>{zone.percentage}</p>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className={`text-lg font-semibold ${zone.color.split(' ')[2]}`}>{zone.hrRange}</p>
                <CardDescription className={`text-xs ${zone.color.split(' ')[2]}/70 mt-1`}>{zone.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Note: These zones are estimates based on the Karvonen formula. For precise zones, consider a lab test.
            VO2 Max input is for your reference and potential future calculator enhancements.
          </p>
        </div>
      )}
    </form>
    </TooltipProvider>
  );
}
