
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calculator, RefreshCw, AlertTriangle, Info, Utensils, Flame, Activity, TargetIcon as GoalIcon, PieChart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type GenderOption = 'male' | 'female';
type UnitOption = 'metric' | 'imperial'; // Metric (kg, cm), Imperial (lbs, inches)
type ActivityLevelOption = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
type GoalOption = 'loseWeight' | 'maintainWeight' | 'gainMuscle';

const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

interface Results {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinGrams: number;
  proteinPercent: number;
  carbGrams: number;
  carbPercent: number;
  fatGrams: number;
  fatPercent: number;
}

export default function CalorieMacronutrientCalculatorForm() {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderOption>('male');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<UnitOption>('metric'); // cm or inches
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<UnitOption>('metric'); // kg or lbs
  const [activityLevel, setActivityLevel] = useState<ActivityLevelOption>('light');
  const [goal, setGoal] = useState<GoalOption>('maintainWeight');

  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const inputBaseClass = "bg-background/70 border-border/70 focus:border-primary";

  useEffect(() => {
    setError(null);
    setResults(null);
  }, [age, gender, height, heightUnit, weight, weightUnit, activityLevel, goal]);

  const calculateMetrics = (): Results | string => {
    const ageNum = parseInt(age, 10);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (isNaN(ageNum) || ageNum <= 0) return "Please enter a valid age.";
    if (isNaN(heightNum) || heightNum <= 0) return "Please enter a valid height.";
    if (isNaN(weightNum) || weightNum <= 0) return "Please enter a valid weight.";

    const heightCm = heightUnit === 'imperial' ? heightNum * CM_PER_INCH : heightNum;
    const weightKg = weightUnit === 'imperial' ? weightNum * KG_PER_LB : weightNum;

    if (heightCm <= 0 || weightKg <= 0) return "Converted height/weight must be positive.";

    // BMR (Mifflin-St Jeor)
    let bmr: number;
    if (gender === 'male') {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) + 5;
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) - 161;
    }
    if (bmr <= 0) return "Calculated BMR is too low or invalid. Check inputs."

    // TDEE
    let activityMultiplier: number;
    switch (activityLevel) {
      case 'sedentary': activityMultiplier = 1.2; break;
      case 'light': activityMultiplier = 1.375; break;
      case 'moderate': activityMultiplier = 1.55; break;
      case 'active': activityMultiplier = 1.725; break;
      case 'veryActive': activityMultiplier = 1.9; break;
      default: activityMultiplier = 1.375;
    }
    const tdee = bmr * activityMultiplier;

    // Target Calories based on Goal
    let targetCalories: number;
    switch (goal) {
      case 'loseWeight': targetCalories = tdee * 0.80; break; // 20% deficit
      case 'maintainWeight': targetCalories = tdee; break;
      case 'gainMuscle': targetCalories = tdee * 1.15; break; // 15% surplus
      default: targetCalories = tdee;
    }
    if (targetCalories < 1000) targetCalories = 1000; // Safety floor

    // Macronutrients
    // Protein: 1.6g/kg for maintenance/gain, 2.0g/kg for fat loss
    const proteinPerKg = goal === 'loseWeight' ? 2.0 : 1.8;
    let proteinGrams = proteinPerKg * weightKg;
    let proteinCalories = proteinGrams * 4;

    // Fat: 25% of target calories
    let fatCalories = targetCalories * 0.25;
    let fatGrams = fatCalories / 9;
    
    // Ensure protein + fat calories don't exceed targetCalories (important for very low calorie targets)
    if (proteinCalories + fatCalories > targetCalories * 0.9) { // Leave at least 10% for carbs
        const excessCalories = (proteinCalories + fatCalories) - (targetCalories * 0.9);
        // Reduce fat first, then protein if still needed
        if (fatCalories > excessCalories * 0.6 && fatCalories - excessCalories * 0.6 > targetCalories * 0.15 ) { // ensure fat isn't too low
            fatCalories -= excessCalories * 0.6;
        } else if (proteinCalories > excessCalories * 0.4 && proteinCalories - excessCalories * 0.4 > weightKg * 1.2 * 4) { // ensure protein isn't too low
             proteinCalories -= excessCalories * 0.4;
        }
        fatGrams = fatCalories / 9;
        proteinGrams = proteinCalories / 4;
    }


    let carbCalories = targetCalories - proteinCalories - fatCalories;
    if (carbCalories < 0) carbCalories = 0; // Carbs cannot be negative
    const carbGrams = carbCalories / 4;

    const proteinPercent = (proteinCalories / targetCalories) * 100;
    const fatPercent = (fatCalories / targetCalories) * 100;
    const carbPercent = (carbCalories / targetCalories) * 100;
    
    return {
      bmr: parseFloat(bmr.toFixed(0)),
      tdee: parseFloat(tdee.toFixed(0)),
      targetCalories: parseFloat(targetCalories.toFixed(0)),
      proteinGrams: parseFloat(proteinGrams.toFixed(0)),
      proteinPercent: parseFloat(proteinPercent.toFixed(1)),
      carbGrams: parseFloat(carbGrams.toFixed(0)),
      carbPercent: parseFloat(carbPercent.toFixed(1)),
      fatGrams: parseFloat(fatGrams.toFixed(0)),
      fatPercent: parseFloat(fatPercent.toFixed(1)),
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    setIsCalculating(true);


    const result = calculateMetrics();
    if (typeof result === 'string') {
      setError(result);
    } else {
      setResults(result);
    }
    setIsCalculating(false);
  };

  const handleClear = () => {
    setAge('');
    setGender('male');
    setHeight('');
    setHeightUnit('metric');
    setWeight('');
    setWeightUnit('metric');
    setActivityLevel('light');
    setGoal('maintainWeight');
    setResults(null);
    setError(null);
    setIsCalculating(false);
  };
  
  const activityLevelOptions = [
    { value: 'sedentary', label: 'Sedentary (little or no exercise)', multiplier: 1.2, description: "Office job, little to no physical activity." },
    { value: 'light', label: 'Lightly Active (1-3 days/week)', multiplier: 1.375, description: "Light exercise or sports 1-3 days a week." },
    { value: 'moderate', label: 'Moderately Active (3-5 days/week)', multiplier: 1.55, description: "Moderate exercise or sports 3-5 days a week." },
    { value: 'active', label: 'Very Active (6-7 days/week)', multiplier: 1.725, description: "Hard exercise or sports 6-7 days a week." },
    { value: 'veryActive', label: 'Extra Active (physical job/training)', multiplier: 1.9, description: "Very hard exercise, physical job, or training twice a day." },
  ];

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 font-body">
        {/* Inputs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Label htmlFor="age" className="text-sm font-medium">Age (Years) <span className="text-destructive">*</span></Label>
            <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g., 30" className={`${inputBaseClass} mt-1`} min="1" required />
          </div>
          <div>
            <Label htmlFor="gender" className="text-sm font-medium">Gender <span className="text-destructive">*</span></Label>
            <Select value={gender} onValueChange={(value) => setGender(value as GenderOption)}>
              <SelectTrigger id="gender" className={`${inputBaseClass} mt-1`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-2 items-end">
            <div>
              <Label htmlFor="height" className="text-sm font-medium">Height <span className="text-destructive">*</span></Label>
              <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={heightUnit === 'metric' ? "e.g., 170" : "e.g., 67"} className={`${inputBaseClass} mt-1`} min="1" step="0.1" required />
            </div>
            <Select value={heightUnit} onValueChange={(value) => setHeightUnit(value as UnitOption)}>
              <SelectTrigger className={`${inputBaseClass}`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="metric">cm</SelectItem><SelectItem value="imperial">inches</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-2 items-end">
            <div>
              <Label htmlFor="weight" className="text-sm font-medium">Weight <span className="text-destructive">*</span></Label>
              <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={weightUnit === 'metric' ? "e.g., 70" : "e.g., 154"} className={`${inputBaseClass} mt-1`} min="1" step="0.1" required />
            </div>
            <Select value={weightUnit} onValueChange={(value) => setWeightUnit(value as UnitOption)}>
              <SelectTrigger className={`${inputBaseClass}`}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="metric">kg</SelectItem><SelectItem value="imperial">lbs</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="activityLevel" className="text-sm font-medium flex items-center">
            Activity Level <span className="text-destructive">*</span>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild><Button type="button" aria-label="More information" variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-primary"><Info size={16}/></Button></TooltipTrigger>
                <TooltipContent className="max-w-xs bg-popover text-popover-foreground border-border shadow-lg p-3 space-y-1" side="top">
                    {activityLevelOptions.map(opt => <p key={opt.value}><span className="font-semibold">{opt.label.split(' (')[0]}:</span> {opt.description}</p>)}
                </TooltipContent>
            </Tooltip>
          </Label>
          <Select value={activityLevel} onValueChange={(value) => setActivityLevel(value as ActivityLevelOption)}>
            <SelectTrigger id="activityLevel" className={`${inputBaseClass} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {activityLevelOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="goal" className="text-sm font-medium">Primary Goal <span className="text-destructive">*</span></Label>
          <Select value={goal} onValueChange={(value) => setGoal(value as GoalOption)}>
            <SelectTrigger id="goal" className={`${inputBaseClass} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="loseWeight">Lose Weight (Calorie Deficit)</SelectItem>
              <SelectItem value="maintainWeight">Maintain Weight</SelectItem>
              <SelectItem value="gainMuscle">Gain Muscle (Calorie Surplus)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="submit" className="w-full sm:w-auto flex-grow bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3" disabled={isCalculating}>
            {isCalculating ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Calculator className="mr-2 h-5 w-5" />} Calculate
          </Button>
          <Button type="button" variant="outline" onClick={handleClear} className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 text-base py-3" disabled={isCalculating}>
            <RefreshCw className="mr-2 h-5 w-5" /> Clear
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-center flex items-center justify-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            <p className="font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <Card className="mt-8 shadow-lg border-border/50 bg-card/90">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl text-primary flex items-center justify-center font-headline">
                <Utensils className="mr-3 h-7 w-7 text-accent-ink" /> Your Estimated Daily Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <p className="text-sm text-muted-foreground font-medium">Basal Metabolic Rate (BMR)</p>
                  <p className="text-2xl font-bold text-accent-ink">{results.bmr} <span className="text-sm text-muted-foreground">kcal/day</span></p>
                </Card>
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <p className="text-sm text-muted-foreground font-medium">Total Daily Energy Expenditure (TDEE)</p>
                  <p className="text-2xl font-bold text-accent-ink">{results.tdee} <span className="text-sm text-muted-foreground">kcal/day</span></p>
                </Card>
              </div>
              
              <Card className="p-6 bg-background border-accent shadow-md text-center">
                 <p className="text-lg text-primary font-semibold mb-1">Target Daily Calories for {
                    goal === 'loseWeight' ? 'Weight Loss' : goal === 'gainMuscle' ? 'Muscle Gain' : 'Maintenance'
                 }</p>
                 <p className="text-4xl font-bold text-accent-ink">{results.targetCalories} <span className="text-lg text-muted-foreground">kcal/day</span></p>
              </Card>

              <div>
                <h4 className="text-xl font-semibold text-primary mb-3 text-center flex items-center justify-center">
                    <PieChart className="mr-2 h-6 w-6 text-accent-ink" /> Estimated Macronutrient Split
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center bg-blue-500/10 border-blue-500/30">
                    <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">Protein</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{results.proteinGrams}g</p>
                    <p className="text-sm text-muted-foreground">({results.proteinPercent}%)</p>
                  </Card>
                  <Card className="p-4 text-center bg-green-500/10 border-green-500/30">
                    <p className="text-lg font-semibold text-green-700 dark:text-green-400">Carbohydrates</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-300">{results.carbGrams}g</p>
                    <p className="text-sm text-muted-foreground">({results.carbPercent}%)</p>
                  </Card>
                  <Card className="p-4 text-center bg-orange-500/10 border-orange-500/30">
                    <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">Fat</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-300">{results.fatGrams}g</p>
                    <p className="text-sm text-muted-foreground">({results.fatPercent}%)</p>
                  </Card>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Disclaimer: These are estimates based on common formulas (Mifflin-St Jeor for BMR). Individual needs may vary. Consult with a healthcare professional or registered dietitian for personalized advice.
              </p>
            </CardContent>
          </Card>
        )}
      </form>
    </TooltipProvider>
  );
}
