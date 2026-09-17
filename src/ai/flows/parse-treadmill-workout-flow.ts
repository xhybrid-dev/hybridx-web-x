
'use server';
/**
 * @fileOverview Converts a natural-language treadmill workout description into
 * a precise, editable list of segments (duration/distance, pace, incline).
 *
 * - parseTreadmillWorkout - Calls the Genkit flow and returns generated segments.
 * - ParseTreadmillWorkoutInput - The input type for the flow.
 * - ParseTreadmillWorkoutOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseTreadmillWorkoutInputSchema = z.object({
  description: z.string().min(3).describe('The athlete\'s free-text description of the treadmill workout.'),
  unit: z.enum(['km', 'mi']).describe('The distance unit the athlete works in.'),
  referencePace: z
    .string()
    .optional()
    .describe("The athlete's known pace, as mm:ss per the given unit, to anchor effort language (RPE, 'steady', 'easy', 'hard') to a real number."),
  referencePaceLabel: z
    .string()
    .optional()
    .describe("What the reference pace represents, e.g. 'easy pace' or '5K race pace'."),
});
export type ParseTreadmillWorkoutInput = z.infer<typeof ParseTreadmillWorkoutInputSchema>;

const GeneratedSegmentSchema = z.object({
  name: z.string().describe('Short label for the segment, e.g. "Incline 4%" or "Warm-up".'),
  mode: z.enum(['time', 'distance']).describe('Whether this segment is measured by duration or distance.'),
  value: z
    .string()
    .describe("Duration as mm:ss or decimal minutes (e.g. '5:00' or '5') when mode is 'time'; plain distance number in the given unit (e.g. '1.6') when mode is 'distance'."),
  pace: z.string().describe("Target pace as mm:ss per the given unit, e.g. '6:30'."),
  incline: z.number().describe('Treadmill incline grade in percent, e.g. 2 for 2%. Use 0 for flat.'),
});

const ParseTreadmillWorkoutOutputSchema = z.object({
  segments: z.array(GeneratedSegmentSchema).min(1).max(60).describe('The workout broken into sequential segments, in order.'),
  summary: z.string().describe('One sentence summarising the generated workout.'),
  assumptions: z
    .array(z.string())
    .describe('Assumptions, defaults, or ambiguities the model resolved, phrased for the athlete to review (e.g. a pace it had to guess). Empty array if the description was fully unambiguous.'),
});
export type ParseTreadmillWorkoutOutput = z.infer<typeof ParseTreadmillWorkoutOutputSchema>;

export async function parseTreadmillWorkout(
  input: ParseTreadmillWorkoutInput,
): Promise<ParseTreadmillWorkoutOutput> {
  return parseTreadmillWorkoutFlow(input);
}

const parseTreadmillWorkoutPrompt = ai.definePrompt({
  name: 'parseTreadmillWorkoutPrompt',
  input: { schema: ParseTreadmillWorkoutInputSchema },
  output: { schema: ParseTreadmillWorkoutOutputSchema },
  prompt: `You are an expert running coach who converts a treadmill workout described in plain language into a precise, executable, segment-by-segment structure that will be simulated second-by-second, so every field must be a concrete number — never a range or a description.

Athlete's description:
"""
{{description}}
"""

Distance unit in use: {{unit}}
{{#if referencePace}}Reference pace ({{referencePaceLabel}}): {{referencePace}} per {{unit}}. Anchor any effort language (RPE, "steady", "easy", "hard", "tempo", etc.) to this pace using standard training-pace relationships (e.g. RPE 6 / "steady" is close to the reference pace; RPE 8-9 / "hard" is meaningfully faster; RPE 3-4 / "recovery" is meaningfully slower).{{else}}No reference pace was given. Pick reasonable paces for a competent recreational runner based on the effort language used, and note every paced value you had to invent in "assumptions".{{/if}}

Rules:
- Output a flat, ordered list of segments — one entry per distinct block of constant pace and incline. Do NOT use a nested or repeating structure: if the description implies repeats (e.g. "6x 3min hard, 2min easy"), expand it into individual segments in sequence (Work, Recovery, Work, Recovery, ... — 12 segments for that example).
- Every "value" and "pace" field must be a concrete number (as mm:ss or decimal minutes/distance) — never a range, a placeholder, or descriptive text.
- If the description gives an explicit total duration or distance, the sum of your segments must match it. When a stepped progression (e.g. "raise incline every 5 min") doesn't divide evenly into the stated total, adjust the step count or the final segment's length so the total is correct, and record what you changed in "assumptions".
- Incline is a percent grade; use 0 for flat treadmill running.
- Give each segment a short, human-readable name describing what it is (e.g. "Incline 3%", "Work interval", "Recovery jog", "Warm-up").
- In "assumptions", list anything you had to infer or resolve — invented paces, how you handled an ambiguous total, rounding decisions. Leave it as an empty array only if the description was fully unambiguous.
- In "summary", describe the resulting workout in one sentence.`,
  config: {
    temperature: 0.2,
  },
});

const parseTreadmillWorkoutFlow = ai.defineFlow(
  {
    name: 'parseTreadmillWorkoutFlow',
    inputSchema: ParseTreadmillWorkoutInputSchema,
    outputSchema: ParseTreadmillWorkoutOutputSchema,
  },
  async (input) => {
    const { output } = await parseTreadmillWorkoutPrompt(input);
    if (!output) {
      throw new Error('The AI model did not return a workout. Try rephrasing the description.');
    }
    if (!output.segments.length) {
      throw new Error('The AI model returned an empty workout. Try rephrasing the description.');
    }
    return output;
  },
);
