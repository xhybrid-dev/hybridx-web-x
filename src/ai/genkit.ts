import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import dotenv from 'dotenv';

// Load environment variables from .env file for local development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
}

/** The Gemini model behind every ai.generate call: the treadmill generator and the guide writer. */
export const WRITER_MODEL = 'googleai/gemini-3.5-flash';

export const ai = genkit({
  plugins: [googleAI()],
  model: WRITER_MODEL,
});
