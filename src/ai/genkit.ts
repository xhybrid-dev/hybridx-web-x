import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import dotenv from 'dotenv';

// Load environment variables from .env file for local development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-3.5-flash',
});
