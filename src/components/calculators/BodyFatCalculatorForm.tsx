
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, RefreshCw, AlertTriangle, Percent, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { navyBodyFatPercent, type BodyFatResult } from '@/lib/calculators/body-fat';

type GenderOption = 'male' | 'female';
type UnitOption = 'cm' | 'inches';

const INCH_TO_CM = 2.54;

export default function BodyFatCalculatorForm() {
  const [gender, setGender] = useState<GenderOption>('male');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<UnitOption>('cm');
  const [neck, setNeck] = useState('');
  const [neckUnit, setNeckUnit] = useState<UnitOption>('cm');
  const [waist, setWaist] = useState('');
  const [waistUnit, setWaistUnit] = useState<UnitOption>('cm');
  const [hip, setHip] = useState(''); // Only for female
  const [hipUnit, setHipUnit] = useState<UnitOption>('cm'); // Only for female

  const [estimatedBFP, setEstimatedBFP] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  useEffect(() => {
    setError(null);
    setEstimatedBFP(null);
    if (gender === 'male') {
      setHip(''); // Clear hip input if gender changes to male
    }
  }, [gender, height, heightUnit, neck, neckUnit, waist, waistUnit, hip, hipUnit]);

  const convertToCm = (value: number, unit: UnitOption): number => {
    if (isNaN(value) || value <= 0) return 0;
    return unit === 'inches' ? value * INCH_TO_CM : value;
  };

  const calculateBFP = (): BodyFatResult => {
    return navyBodyFatPercent({
      sex: gender,
      heightCm: convertToCm(parseFloat(height), heightUnit),
      neckCm: convertToCm(parseFloat(neck), neckUnit),
      waistCm: convertToCm(parseFloat(waist), waistUnit),
      hipCm: gender === 'female' ? convertToCm(parseFloat(hip), hipUnit) : undefined,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEstimatedBFP(null);
    setIsCalculating(true);

    const result = calculateBFP();

    if (result.ok) {
      setEstimatedBFP(`${result.percent}%`);
    } else {
      setError(result.message);
    }
    setIsCalculating(false);
  };

  const handleClear = () => {
    setGender('male');
    setHeight('');
    setHeightUnit('cm');
    setNeck('');
    setNeckUnit('cm');
    setWaist('');
    setWaistUnit('cm');
    setHip('');
    setHipUnit('cm');
    setEstimatedBFP(null);
    setError(null);
    setIsCalculating(false);
  };

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 font-body">
      <div>
        <Label className="text-sm font-medium block mb-2">Gender <span className="text-destructive">*</span></Label>
        <RadioGroup
            value={gender}
            onValueChange={(value) => setGender(value as GenderOption)}
            className="flex space-x-4"
        >
            <Label htmlFor="male" className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${gender === 'male' ? 'bg-primary text-primary-foreground border-primary ring-1 ring-primary' : 'bg-background hover:bg-muted/50 border-border'}`}>
                <RadioGroupItem value="male" id="male" />
                <span>Male</span>
            </Label>
            <Label htmlFor="female" className={`flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-colors ${gender === 'female' ? 'bg-primary text-primary-foreground border-primary ring-1 ring-primary' : 'bg-background hover:bg-muted/50 border-border'}`}>
                <RadioGroupItem value="female" id="female" />
                <span>Female</span>
            </Label>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div className="grid grid-cols-[2fr_1fr] gap-2 items-end">
            <div>
                <Label htmlFor="height" className="text-sm font-medium">Height <span className="text-destructive">*</span></Label>
                <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g., 170" className={`${inputBaseClass} mt-1`} min="1" step="0.1" required />
            </div>
            <Select value={heightUnit} onValueChange={(value) => setHeightUnit(value as UnitOption)}>
                <SelectTrigger className={`${inputBaseClass}`}> <SelectValue /> </SelectTrigger>
                <SelectContent> <SelectItem value="cm">cm</SelectItem> <SelectItem value="inches">inches</SelectItem> </SelectContent>
            </Select>
        </div>
         <div className="grid grid-cols-[2fr_1fr] gap-2 items-end">
            <div>
                <Label htmlFor="neck" className="text-sm font-medium">Neck Circumference <span className="text-destructive">*</span></Label>
                <Input id="neck" type="number" value={neck} onChange={(e) => setNeck(e.target.value)} placeholder="e.g., 38" className={`${inputBaseClass} mt-1`} min="1" step="0.1" required />
            </div>
             <Select value={neckUnit} onValueChange={(value) => setNeckUnit(value as UnitOption)}>
                <SelectTrigger className={`${inputBaseClass}`}> <SelectValue /> </SelectTrigger>
                <SelectContent> <SelectItem value="cm">cm</SelectItem> <SelectItem value="inches">inches</SelectItem> </SelectContent>
            </Select>
        </div>
         <div className="grid grid-cols-[2fr_1fr] gap-2 items-end">
            <div>
                <Label htmlFor="waist" className="text-sm font-medium">Waist Circumference <span className="text-destructive">*</span></Label>
                <Input id="waist" type="number" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="e.g., 80" className={`${inputBaseClass} mt-1`} min="1" step="0.1" required />
            </div>
             <Select value={waistUnit} onValueChange={(value) => setWaistUnit(value as UnitOption)}>
                <SelectTrigger className={`${inputBaseClass}`}> <SelectValue /> </SelectTrigger>
                <SelectContent> <SelectItem value="cm">cm</SelectItem> <SelectItem value="inches">inches</SelectItem> </SelectContent>
            </Select>
        </div>

        {gender === 'female' && (
          <div className="grid grid-cols-[2fr_1fr] gap-2 items-end">
             <div>
                <Label htmlFor="hip" className="text-sm font-medium">Hip Circumference <span className="text-destructive">*</span></Label>
                <Input id="hip" type="number" value={hip} onChange={(e) => setHip(e.target.value)} placeholder="e.g., 95" className={`${inputBaseClass} mt-1`} min="1" step="0.1" required={gender === 'female'} />
            </div>
            <Select value={hipUnit} onValueChange={(value) => setHipUnit(value as UnitOption)}>
                <SelectTrigger className={`${inputBaseClass}`}> <SelectValue /> </SelectTrigger>
                <SelectContent> <SelectItem value="cm">cm</SelectItem> <SelectItem value="inches">inches</SelectItem> </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center"><Info size={14} className="mr-1.5 text-primary/70" /> For waist measurement, measure at the navel level for men, and at the narrowest point for women.</p>
        <p className="flex items-center"><Info size={14} className="mr-1.5 text-primary/70" /> For hip measurement (females), measure at the widest point of the hips/buttocks.</p>
        <p className="flex items-center"><Info size={14} className="mr-1.5 text-primary/70" /> For neck measurement, measure just below the larynx (Adam's apple).</p>
      </div>


      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button type="submit" className="w-full sm:w-auto flex-grow bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3" disabled={isCalculating}>
          {isCalculating ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Calculator className="mr-2 h-5 w-5" />}
          Calculate BFP
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

      {estimatedBFP && (
        <Card className="mt-6 shadow-md border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-4 text-center">
            <CardTitle className="text-xl md:text-2xl font-semibold text-primary flex items-center justify-center">
              <Percent className="mr-2 h-6 w-6 text-accent-ink" /> Estimated Body Fat Percentage
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-4">
            <p className="text-3xl md:text-4xl font-bold text-accent-ink">{estimatedBFP}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Disclaimer: This is an estimate based on the U.S. Navy formula. For precise body fat measurement, consult a healthcare professional or use methods like DEXA scans or hydrostatic weighing.
            </p>
          </CardContent>
        </Card>
      )}
    </form>
    </TooltipProvider>
  );
}
