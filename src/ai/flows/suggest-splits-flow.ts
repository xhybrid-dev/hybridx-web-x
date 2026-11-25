
'use server';
/**
 * @fileOverview Provides AI-powered elevation-adjusted split time recommendations for runners.
 *
 * - suggestElevationAdjustedSplits - A function that calls a Genkit flow to get split recommendations.
 * - SuggestSplitsInput - The input type for the flow.
 * - SplitSuggestion - The type for a single split suggestion.
 * - SuggestSplitsOutput - The return type for the flow (array of SplitSuggestion).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { guardAiCall } from '@/lib/ai-guard';

// Define the schema for individual points in the GPX route profile
const GpxPointSchema = z.object({
  distanceKm: z.number().describe('Cumulative distance from the start in kilometers.'),
  elevationMeters: z.number().describe('Elevation at this point in meters.'),
});

// Define the input schema for the Genkit flow
const SuggestSplitsInputSchema = z.object({
  // The calculator sends at most 500 points (src/components/calculators/SplitTimeCalculatorForm.tsx).
  gpxRouteProfile: z.array(GpxPointSchema).min(2).max(600).describe('An array of points representing the route profile, with cumulative distance and elevation. Must have at least 2 points.'),
  totalTargetTimeSeconds: z.number().positive().describe('The runner\'s total target time for the race in seconds.'),
  splitIntervalKm: z.number().positive().describe('The desired interval for each split in kilometers (e.g., 1 for 1km splits).'),
});
export type SuggestSplitsInput = z.infer<typeof SuggestSplitsInputSchema>;

// Define the schema for a single split suggestion
const SplitSuggestionSchema = z.object({
  splitNumber: z.number().int().positive().describe('The sequential number of the split (e.g., 1, 2, 3).'),
  splitDistanceKm: z.number().positive().describe('The cumulative distance at the end of this split in kilometers.'),
  recommendedTimeSeconds: z.number().positive().describe('The recommended cumulative time to reach the end of this split in seconds.'),
  averagePaceMinPerKm: z.number().positive().describe('The recommended average pace for this specific split in minutes per kilometer.'),
  notes: z.string().optional().describe('Brief coaching notes or advice for this split (e.g., "Steep uphill, focus on effort", "Downhill, recover but control pace").'),
});
export type SplitSuggestion = z.infer<typeof SplitSuggestionSchema>;

// Define the output schema for the Genkit flow
const SuggestSplitsOutputSchema = z.array(SplitSuggestionSchema).describe('An array of split suggestions for the race.');
export type SuggestSplitsOutput = z.infer<typeof SuggestSplitsOutputSchema>;


// Exported wrapper function to call the flow
export async function suggestElevationAdjustedSplits(input: SuggestSplitsInput): Promise<SuggestSplitsOutput> {
  if (!Array.isArray(input?.gpxRouteProfile) || input.gpxRouteProfile.length < 2) {
    throw new Error("GPX route profile must contain at least two points.");
  }
  if (input.gpxRouteProfile.length > 600) {
    throw new Error('That route has too many points. Use a simpler GPX file.');
  }
  await guardAiCall('elevation-splits');
  // Potentially add more validation or pre-processing here if needed
  return suggestSplitsFlow(input);
}

// Define the Genkit prompt
const suggestSplitsPrompt = ai.definePrompt({
  name: 'suggestSplitsPrompt',
  input: { schema: SuggestSplitsInputSchema },
  output: { schema: SuggestSplitsOutputSchema },
  prompt: `You are an expert running coach specializing in race strategy and pacing for routes with varying elevation.
Your task is to analyze a given race route profile and a target finish time, then provide recommended split times for specified intervals.
The goal is to help the runner maintain a relatively consistent effort throughout the race, adjusting pace for uphills (slower pace) and downhills (faster, controlled pace) to meet the overall target time.

Runner's Total Target Time: {{totalTargetTimeSeconds}} seconds.
Desired Split Interval: {{splitIntervalKm}} kilometers.

Route Profile (cumulative distance in km, elevation in meters):
{{#each gpxRouteProfile}}
- At {{distanceKm}} km, elevation is {{elevationMeters}} m.
{{/each}}

Based on this information, provide an array of split suggestions. Each suggestion should include:
- splitNumber: The sequential number of the split.
- splitDistanceKm: The cumulative distance at the end of this split (e.g., if splitIntervalKm is 1, then 1, 2, 3...).
- recommendedTimeSeconds: The recommended CUMULATIVE time to reach the end of this split.
- averagePaceMinPerKm: The recommended average pace (minutes per kilometer) FOR THIS SPECIFIC SPLIT.
- notes: (Optional) Brief coaching advice for this split, considering the terrain. For example: "Steep uphill section, focus on maintaining effort, not pace." or "Gradual downhill, use it to recover but stay controlled."

Ensure the sum of individual split times (derived from recommendedTimeSeconds for cumulative) approximately equals the totalTargetTimeSeconds.
The final split might be shorter if the total race distance is not an exact multiple of splitIntervalKm. Calculate the pace for the final split accordingly.
Be realistic with pace adjustments. Significant climbs will slow pace, descents can speed it up, but extreme changes might not be sustainable.
Prioritize a consistent effort level.
The output MUST be a valid JSON array conforming to the output schema.`,
  config: {
    temperature: 0.3, // Lower temperature for more deterministic pacing advice
  }
});

// Define the Genkit flow
const suggestSplitsFlow = ai.defineFlow(
  {
    name: 'suggestSplitsFlow',
    inputSchema: SuggestSplitsInputSchema,
    outputSchema: SuggestSplitsOutputSchema,
  },
  async (input) => {
    const { output } = await suggestSplitsPrompt(input);
    if (!output) {
      throw new Error('The AI model did not return any output for split suggestions.');
    }
    // Basic validation: ensure all required fields are present in the output.
    // Zod schema validation will handle most of this at the prompt level, but an extra check can be useful.
    output.forEach(split => {
        if (typeof split.splitNumber !== 'number' ||
            typeof split.splitDistanceKm !== 'number' ||
            typeof split.recommendedTimeSeconds !== 'number' ||
            typeof split.averagePaceMinPerKm !== 'number') {
            throw new Error('AI returned an invalid split format. Missing required fields.');
        }
    });
    return output;
  }
);

