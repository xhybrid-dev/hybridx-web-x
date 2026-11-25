
'use client';

import { useState, useEffect, type FormEvent, type ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Timer, UploadCloud, RefreshCw, AlertTriangle, BarChart3, Info, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import GPX from 'gpx-js';
import { suggestElevationAdjustedSplits, type SuggestSplitsInput, type SplitSuggestion } from '@/ai/flows/suggest-splits-flow';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type UnitOption = 'km' | 'miles';
const KM_IN_MILES = 1.60934;

interface ElevationPoint {
  distanceKm: number;
  elevation: number;
}

interface CalculatedSplit {
  segment: string;
  time: string;
  pace: string;
  notes?: string;
}

export default function SplitTimeCalculatorForm() {
  const [targetDistance, setTargetDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<UnitOption>('km');
  
  const [targetHours, setTargetHours] = useState('');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [targetSeconds, setTargetSeconds] = useState('');
  
  const [splitInterval, setSplitInterval] = useState('1');
  const [splitUnit, setSplitUnit] = useState<UnitOption>('km');
  
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxFileName, setGpxFileName] = useState<string>('');
  const [parsedGpxData, setParsedGpxData] = useState<ElevationPoint[] | null>(null);
  const [gpxTotalDistanceKm, setGpxTotalDistanceKm] = useState<number | null>(null);

  const [calculatedSplits, setCalculatedSplits] = useState<CalculatedSplit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  const currentTimeInSeconds = 
    (parseInt(targetHours, 10) || 0) * 3600 + 
    (parseInt(targetMinutes, 10) || 0) * 60 + 
    (parseFloat(targetSeconds) || 0);

  useEffect(() => {
    setError(null);
    setCalculatedSplits(null);
  }, [
    targetDistance, 
    distanceUnit, 
    targetHours, 
    targetMinutes, 
    targetSeconds, 
    splitInterval, 
    splitUnit, 
    gpxFile,
    parsedGpxData // Also reset if parsedGpxData changes (e.g., file removed)
  ]);


  const parseTimeToSeconds = (h: string, m: string, s: string): number => {
    return (parseInt(h, 10) || 0) * 3600 + (parseInt(m, 10) || 0) * 60 + (parseFloat(s) || 0);
  };

  const formatSecondsToTime = (totalSeconds: number, showHours: boolean = true): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return showHours ? "00:00:00" : "00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (showHours || h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setGpxFile(file);
      setGpxFileName(file.name);
      setError(null);
      setParsedGpxData(null); 
      setCalculatedSplits(null);
      setGpxTotalDistanceKm(null); 
      setIsLoading(true);

      try {
        const fileContent = await file.text();
        const gpx = new GPX(fileContent);
        if (gpx.tracks.length === 0 || gpx.tracks[0].points.length === 0) {
          setError('GPX file contains no track points.');
          setIsLoading(false);
          setGpxFile(null); 
          setGpxFileName('');
          setGpxTotalDistanceKm(null);
          setParsedGpxData(null);
          return;
        }

        let cumulativeDistanceKm = 0;
        const elevationProfile: ElevationPoint[] = [];
        let lastPoint: { lat: number, lon: number } | null = null;

        gpx.tracks[0].points.forEach(point => {
          if (point.lat === undefined || point.lon === undefined || point.ele === undefined) return;
          
          if (lastPoint) {
            cumulativeDistanceKm += calculateHaversineDistance(lastPoint.lat, lastPoint.lon, point.lat, point.lon);
          }
          elevationProfile.push({
            distanceKm: parseFloat(cumulativeDistanceKm.toFixed(3)),
            elevation: parseFloat(point.ele.toFixed(2)),
          });
          lastPoint = { lat: point.lat, lon: point.lon };
        });
        
        if (elevationProfile.length < 2) {
            setError('GPX file does not contain enough valid points for processing.');
            setGpxFile(null);
            setGpxFileName('');
            setParsedGpxData(null);
            setGpxTotalDistanceKm(null);
            setIsLoading(false);
            return;
        }
        
        setParsedGpxData(elevationProfile);
        setGpxTotalDistanceKm(cumulativeDistanceKm);
        // Auto-fill the distance and set unit to km
        setTargetDistance(cumulativeDistanceKm.toFixed(2)); 
        setDistanceUnit('km'); 
        toast({ title: "GPX File Processed", description: `Route loaded: ${cumulativeDistanceKm.toFixed(2)} km.` });

      } catch (err) {
        console.error("GPX Parsing Error:", err);
        setError('Failed to parse GPX file. Please ensure it is a valid GPX.');
        setGpxFile(null);
        setGpxFileName('');
        setParsedGpxData(null);
        setGpxTotalDistanceKm(null);
      } finally {
        setIsLoading(false);
      }
    } else { 
        setGpxFile(null);
        setGpxFileName('');
        setParsedGpxData(null);
        setGpxTotalDistanceKm(null);
    }
  };
  
  const processGpxDataForFlow = (profile: ElevationPoint[], sampleIntervalKm = 0.1): { distanceKm: number; elevationMeters: number }[] => {
    if (!profile || profile.length < 2) return []; // Need at least two points
    
    const sampledProfile: { distanceKm: number; elevationMeters: number }[] = [];
    let nextSampleDistance = 0;
    
    // Ensure the first point is always included
    sampledProfile.push({ distanceKm: profile[0].distanceKm, elevationMeters: profile[0].elevation });
    nextSampleDistance = sampleIntervalKm; // Start sampling from the first interval

    for (let i = 1; i < profile.length; i++) {
        const prev = profile[i-1];
        const curr = profile[i];

        // Add interpolated points between prev and curr if they fall on sample intervals
        while (nextSampleDistance < curr.distanceKm && sampledProfile.length < 500) { 
            if (nextSampleDistance > prev.distanceKm) { // Ensure we are past the previous point's distance
                 const fraction = (curr.distanceKm - prev.distanceKm === 0) ? 0 : (nextSampleDistance - prev.distanceKm) / (curr.distanceKm - prev.distanceKm);
                 const interpolatedElevation = prev.elevation + fraction * (curr.elevation - prev.elevation);
                 sampledProfile.push({ distanceKm: parseFloat(nextSampleDistance.toFixed(3)), elevationMeters: parseFloat(interpolatedElevation.toFixed(2)) });
            }
            nextSampleDistance += sampleIntervalKm;
        }
         // If current point is exactly on a sample interval or very close, ensure it's captured or the next sample is beyond it
        if (curr.distanceKm >= nextSampleDistance - (sampleIntervalKm / 2) && curr.distanceKm < nextSampleDistance + (sampleIntervalKm / 2) && sampledProfile.length < 500) {
            if(sampledProfile[sampledProfile.length-1].distanceKm < curr.distanceKm) { // Avoid duplicates
                 sampledProfile.push({ distanceKm: curr.distanceKm, elevationMeters: curr.elevation });
            }
            nextSampleDistance = Math.ceil(curr.distanceKm / sampleIntervalKm) * sampleIntervalKm + sampleIntervalKm;
        }

    }
    
    // Ensure the last point is always included if it wasn't captured by sampling
    const lastPoint = profile[profile.length - 1];
    if (sampledProfile.length > 0 && sampledProfile[sampledProfile.length-1].distanceKm < lastPoint.distanceKm && sampledProfile.length < 500 ) {
         sampledProfile.push({ distanceKm: lastPoint.distanceKm, elevationMeters: lastPoint.elevation });
    }
    // Filter out any NaN values just in case
    return sampledProfile.filter(p => !isNaN(p.distanceKm) && !isNaN(p.elevationMeters));
};


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCalculatedSplits(null);
    setIsLoading(true);

    const totalTimeSec = parseTimeToSeconds(targetHours, targetMinutes, targetSeconds);
    if (totalTimeSec <= 0 && (!gpxFile || typeof gpxTotalDistanceKm !== 'number' || gpxTotalDistanceKm > 0)) { // Allow 0 time if distance is also 0
      setError('Please enter a valid target time.');
      setIsLoading(false);
      return;
    }

    const splitIntervalNum = parseFloat(splitInterval);
    if (isNaN(splitIntervalNum) || splitIntervalNum <= 0) {
      setError('Please enter a valid split interval.');
      setIsLoading(false);
      return;
    }
    const splitIntervalKm = splitUnit === 'km' ? splitIntervalNum : splitIntervalNum * KM_IN_MILES;

    let currentTargetDistanceKm: number;

    if (gpxFile && typeof gpxTotalDistanceKm === 'number') {
        currentTargetDistanceKm = gpxTotalDistanceKm;
    } else if (gpxFile && typeof gpxTotalDistanceKm !== 'number') {
        setError('GPX distance not determined. Please re-upload or remove GPX file for manual distance input.');
        setIsLoading(false);
        return;
    } else { 
        const distNum = parseFloat(targetDistance);
        if (isNaN(distNum) || distNum < 0) { // Allow 0 distance
            setError('Please enter a valid target distance.');
            setIsLoading(false);
            return;
        }
        currentTargetDistanceKm = distanceUnit === 'km' ? distNum : distNum * KM_IN_MILES;
    }

    if (currentTargetDistanceKm === 0 && totalTimeSec === 0) {
        setCalculatedSplits([]);
        toast({ title: "No Splits to Calculate", description: "Distance and time are zero." });
        setIsLoading(false);
        return;
    }
    if (currentTargetDistanceKm > 0 && totalTimeSec <= 0) {
        setError('Target time must be greater than zero for non-zero distance.');
        setIsLoading(false);
        return;
    }
    if (currentTargetDistanceKm <= 0 && totalTimeSec > 0) {
        setError('Target distance must be greater than zero for non-zero time.');
        setIsLoading(false);
        return;
    }
     if (currentTargetDistanceKm > 0 && currentTargetDistanceKm < splitIntervalKm ) {
         setError('Total distance is less than one split interval.');
         setIsLoading(false);
         return;
      }


    if (parsedGpxData && parsedGpxData.length > 0 && gpxFile) { 
        try {
            const flowInputData = processGpxDataForFlow(parsedGpxData);
            if (flowInputData.length < 2) {
                setError('Not enough data points from GPX for AI splits (minimum 2 required). Check GPX quality or try basic splits.');
                setIsLoading(false);
                return;
            }

            const aiInput: SuggestSplitsInput = {
                gpxRouteProfile: flowInputData,
                totalTargetTimeSeconds: totalTimeSec,
                splitIntervalKm: splitIntervalKm,
            };
            const aiSplits: SplitSuggestion[] = await suggestElevationAdjustedSplits(aiInput);
            
            const formattedAiSplits: CalculatedSplit[] = aiSplits.map(s => ({
                segment: `Split ${s.splitNumber} (${s.splitDistanceKm.toFixed(2)} km)`,
                time: formatSecondsToTime(s.recommendedTimeSeconds, totalTimeSec > 3600),
                pace: `${formatSecondsToTime(s.averagePaceMinPerKm * 60, false)}/km`,
                notes: s.notes,
            }));
            setCalculatedSplits(formattedAiSplits);
            toast({ title: "AI Splits Generated", description: "Elevation-adjusted splits calculated." });
        } catch (aiError: any) {
            console.error("AI Split Calculation Error:", aiError);
            setError(`AI split calculation failed: ${aiError.message || 'Unknown error'}. Try basic splits or check GPX.`);
            toast({ variant: "destructive", title: "AI Error", description: `Could not generate AI splits: ${aiError.message}` });
        }
    } else {
      const numSplits = Math.floor(currentTargetDistanceKm / splitIntervalKm);
      const timePerKm = currentTargetDistanceKm > 0 ? totalTimeSec / currentTargetDistanceKm : 0; // Avoid division by zero
      const timePerSplitInterval = timePerKm * splitIntervalKm;
      
      const basicSplits: CalculatedSplit[] = [];
      for (let i = 1; i <= numSplits; i++) {
        const splitEndDistanceKm = i * splitIntervalKm;
        const splitEndDistanceDisplay = splitUnit === 'km' ? splitEndDistanceKm.toFixed(2) : (splitEndDistanceKm / KM_IN_MILES).toFixed(2);
        basicSplits.push({
          segment: `Split ${i} (End: ${splitEndDistanceDisplay} ${splitUnit})`,
          time: formatSecondsToTime(i * timePerSplitInterval, totalTimeSec > 3600),
          pace: formatSecondsToTime(timePerSplitInterval / (splitIntervalNum > 0 ? splitIntervalNum : 1), false) + `/${splitUnit}`,
        });
      }
      
      const remainingDistanceKm = currentTargetDistanceKm - (numSplits * splitIntervalKm);
      if (remainingDistanceKm > 0.01 * (splitUnit === 'km' ? 1 : KM_IN_MILES)) { 
        const remainingTime = remainingDistanceKm * timePerKm;
        const finalSplitDistanceDisplay = splitUnit === 'km' ? currentTargetDistanceKm.toFixed(2) : (currentTargetDistanceKm / KM_IN_MILES).toFixed(2);
        const remainingDistanceInSplitUnit = splitUnit === 'km' ? remainingDistanceKm : remainingDistanceKm / KM_IN_MILES;
        
        basicSplits.push({
          segment: `Final (End: ${finalSplitDistanceDisplay} ${splitUnit})`,
          time: formatSecondsToTime(totalTimeSec, totalTimeSec > 3600),
          pace: formatSecondsToTime(remainingTime / (remainingDistanceInSplitUnit > 0 ? remainingDistanceInSplitUnit : 1), false) + `/${splitUnit}`,
        });
      }
      setCalculatedSplits(basicSplits);
      toast({ title: "Basic Splits Calculated", description: "Even splits generated." });
    }

    setIsLoading(false);
  };

  const handleClear = () => {
    setTargetDistance('');
    setDistanceUnit('km');
    setTargetHours('');
    setTargetMinutes('');
    setTargetSeconds('');
    setSplitInterval('1'); 
    setSplitUnit('km');
    setGpxFile(null);
    setGpxFileName('');
    setParsedGpxData(null);
    setGpxTotalDistanceKm(null);
    setCalculatedSplits(null);
    setError(null);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
    }
  };

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 font-body">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
          <h3 className="text-lg font-medium text-primary mb-2">Race &amp; Split Details</h3>
          
          <div className="grid grid-cols-2 gap-4 items-end">
              <div>
              <Label htmlFor="targetDistance" className="text-sm font-medium">Target Distance</Label>
              <Input
                  id="targetDistance" type="number" value={targetDistance}
                  onChange={(e) => setTargetDistance(e.target.value)} 
                  placeholder={gpxFile && typeof gpxTotalDistanceKm === 'number' ? `${gpxTotalDistanceKm.toFixed(2)}` : "e.g., 10"}
                  className={`${inputBaseClass} mt-1`} min="0" step="0.01"
                  disabled={!!gpxFile} 
              />
              </div>
              <div>
              <Label htmlFor="distanceUnit" className="text-sm font-medium">Unit</Label>
              <Select value={distanceUnit} onValueChange={(value) => setDistanceUnit(value as UnitOption)} disabled={!!gpxFile}>
                  <SelectTrigger id="distanceUnit" className={`${inputBaseClass} mt-1`}>
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
            <Label className="text-sm font-medium">Target Time (HH:MM:SS) <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Input type="number" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} placeholder="HH" className={inputBaseClass} min="0" />
              <Input type="number" value={targetMinutes} onChange={(e) => setTargetMinutes(e.target.value)} placeholder="MM" className={inputBaseClass} min="0" max="59" required={!targetHours && !targetSeconds && currentTimeInSeconds === 0 && (!gpxFile || parseFloat(targetDistance) > 0)} />
              <Input type="number" value={targetSeconds} onChange={(e) => setTargetSeconds(e.target.value)} placeholder="SS" className={inputBaseClass} min="0" max="59.99" step="0.01" required={!targetHours && !targetMinutes && currentTimeInSeconds === 0 && (!gpxFile || parseFloat(targetDistance) > 0)}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <Label htmlFor="splitInterval" className="text-sm font-medium">Split Every</Label>
              <Input id="splitInterval" type="number" value={splitInterval} onChange={(e) => setSplitInterval(e.target.value)} placeholder="e.g., 1" className={`${inputBaseClass} mt-1`} min="0.1" step="0.1" required/>
            </div>
            <div>
              <Label htmlFor="splitUnit" className="text-sm font-medium">Unit for Splits</Label>
              <Select value={splitUnit} onValueChange={(value) => setSplitUnit(value as UnitOption)}>
                <SelectTrigger id="splitUnit" className={`${inputBaseClass} mt-1`}> <SelectValue /> </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Kilometers (km)</SelectItem>
                  <SelectItem value="miles">Miles (mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5 flex flex-col justify-center">
          <h3 className="text-lg font-medium text-primary mb-2 flex items-center">
            Upload GPX (Optional for AI Splits)
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"><Info size={16}/></Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border-border shadow-lg" side="top">
                    <p>Upload a GPX file from your GPS device or app to get AI-powered, elevation-adjusted split recommendations. Target distance will be auto-filled from the GPX.</p>
                </TooltipContent>
            </Tooltip>
          </h3>
          <Label htmlFor="gpxFile" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors ${gpxFile ? 'border-green-500' : 'border-border/70'}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className={`w-8 h-8 mb-2 ${gpxFile ? 'text-green-500' : 'text-muted-foreground'}`} />
              <p className={`mb-1 text-sm ${gpxFile ? 'text-green-500 font-semibold' : 'text-muted-foreground'}`}>
                {gpxFileName || 'Click to upload GPX file (Max 5MB)'}
              </p>
              {gpxFileName && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Selected: {gpxFileName}</p>}
               {!gpxFileName && <p className="text-xs text-muted-foreground/70">Or drag and drop</p>}
            </div>
            <Input id="gpxFile" type="file" className="hidden" onChange={handleFileChange} accept=".gpx" ref={fileInputRef} />
          </Label>
          {gpxFile && typeof gpxTotalDistanceKm === 'number' && (
            <p className="text-sm text-primary">GPX Route Distance: {gpxTotalDistanceKm.toFixed(2)} km</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button type="submit" className="w-full sm:w-auto flex-grow bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Timer className="mr-2 h-5 w-5" />}
          {isLoading ? 'Calculating...' : (gpxFile && parsedGpxData ? 'Calculate AI Splits' : 'Calculate Basic Splits')}
        </Button>
        <Button type="button" variant="outline" onClick={handleClear} className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 text-base py-3" disabled={isLoading}>
          <RefreshCw className="mr-2 h-5 w-5" /> Clear All
        </Button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-center flex items-center justify-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
          <p className="font-medium text-destructive">{error}</p>
        </div>
      )}

      {calculatedSplits && calculatedSplits.length > 0 && (
        <Card className="mt-8 shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl text-accent-ink flex items-center">
              <BarChart3 className="mr-3 h-7 w-7" /> {gpxFile && parsedGpxData ? 'AI-Powered Race Splits' : 'Calculated Race Splits'}
            </CardTitle>
            <CardDescription className="font-body">
              {gpxFile && parsedGpxData ? 'These splits are adjusted for elevation changes based on your GPX file.' : 'These are evenly paced splits for your target time and distance.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {parsedGpxData && parsedGpxData.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-primary mb-2">Elevation Profile (km vs meters)</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={parsedGpxData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                    <XAxis dataKey="distanceKm" unit="km" type="number" domain={['dataMin', 'dataMax']} stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => val.toFixed(1)} />
                    <YAxis stroke="hsl(var(--muted-foreground))" domain={['dataMin - 10', 'dataMax + 10']} />
                    <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}} 
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number, name: string) => [`${value.toFixed(1)}m`, "Elevation"]}
                        labelFormatter={(label: number) => `Dist: ${label.toFixed(2)}km`}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                    <Line type="monotone" dataKey="elevation" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Elevation (m)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-3 font-headline text-primary">Split</th>
                    <th className="p-3 font-headline text-primary">Cumulative Time</th>
                    <th className="p-3 font-headline text-primary">Pace for Split</th>
                    {gpxFile && parsedGpxData && <th className="p-3 font-headline text-primary">Coach Notes</th>}
                  </tr>
                </thead>
                <tbody>
                  {calculatedSplits.map((split, index) => (
                    <tr key={index} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-3">{split.segment}</td>
                      <td className="p-3">{split.time}</td>
                      <td className="p-3">{split.pace}</td>
                      {gpxFile && parsedGpxData && <td className="p-3 text-sm text-muted-foreground">{split.notes || 'N/A'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
             <p className="text-xs text-muted-foreground text-center pt-2">
                {gpxFile && parsedGpxData ? 'AI-powered splits are estimates. Actual performance may vary.' : 'Paces are based on even distribution of target time over distance.'}
            </p>
          </CardContent>
        </Card>
      )}
       {calculatedSplits && calculatedSplits.length === 0 && !error && (
          <Card className="mt-8 shadow-lg border-border/50">
             <CardHeader>
                <CardTitle className="text-2xl text-accent-ink flex items-center">
                    <Info className="mr-3 h-7 w-7" /> No Splits to Display
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Splits could not be calculated with the current inputs (e.g., 0 distance and 0 time, or distance less than one split interval).</p>
            </CardContent>
          </Card>
        )}
    </form>
    </TooltipProvider>
  );
}
