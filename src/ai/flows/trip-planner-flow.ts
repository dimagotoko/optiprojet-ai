'use server';

import { firebaseConfig } from '@/firebase/config';
import { getAi } from '@/ai/genkit';

// Pure TypeScript types — no genkit import at module level
export type TripPlanInput = string;
export type TripPlanOutput = {
  departure?: string;
  destination?: string;
  date?: string;
  isComplete: boolean;
  missingInfo: 'departure' | 'destination' | 'date' | 'none';
};

// Verifies a Firebase ID token via Google's REST API — no firebase-admin needed.
async function verifyFirebaseIdToken(idToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// Lazy singleton — prompt and flow are created only on the first real AI call,
// not at module load time.
let _planTripFlow: ((query: string) => Promise<TripPlanOutput>) | null = null;

function getPlanTripFlow(): (query: string) => Promise<TripPlanOutput> {
  if (_planTripFlow) return _planTripFlow;

  const ai = getAi();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { z } = require('genkit') as typeof import('genkit');

  const outputSchema = z.object({
    departure: z.string().optional().describe('The starting location or city for the trip.'),
    destination: z.string().optional().describe('The ending location or city for the trip.'),
    date: z.string().optional().describe('The desired date for the trip in YYYY-MM-DD format.'),
    isComplete: z.boolean().describe('Set to true if both departure and destination are extracted.'),
    missingInfo: z
      .enum(['departure', 'destination', 'date', 'none'])
      .describe('Which piece of information is missing, if any.'),
  });

  const prompt = ai.definePrompt(
    {
      name: 'tripPlanPrompt',
      input: { schema: z.string().describe('A natural language query from a user looking for a carpool ride.') },
      output: { schema: outputSchema },
      prompt: `You are an expert at parsing user requests for carpooling. Your goal is to extract the departure location, destination location, and date from the user's query.

    The user's query is in French. All extracted locations should be in Canada, likely in Québec.

    1.  Analyze the user's query: {{{prompt}}}
    2.  Extract 'departure', 'destination', and 'date'.
    3.  Determine if you have both a 'departure' and a 'destination'.
        - If YES: set 'isComplete' to true and 'missingInfo' to 'none'.
        - If NO: set 'isComplete' to false. Identify and set 'missingInfo' to 'departure' if the origin is missing, or 'destination' if the end point is missing.
    4.  If the user mentions "demain" (tomorrow), "après-demain" (day after tomorrow), or a day of the week, calculate the correct date in YYYY-MM-DD format based on the current date.

    Examples:
    - User query: "je veux aller de montréal à québec demain" -> departure: "Montréal", destination: "Québec", date: (tomorrow's date), isComplete: true, missingInfo: 'none'
    - User query: "je cherche un trajet pour laval" -> departure: undefined, destination: "Laval", isComplete: false, missingInfo: 'departure'
    - User query: "un voyage partant de Brossard" -> departure: "Brossard", destination: undefined, isComplete: false, missingInfo: 'destination'
    `,
    }
  );

  _planTripFlow = ai.defineFlow(
    {
      name: 'planTripFlow',
      inputSchema: z.string().describe('A natural language query from a user looking for a carpool ride.'),
      outputSchema: outputSchema,
    },
    async (query) => {
      const { output } = await prompt(query);
      return output!;
    }
  ) as (query: string) => Promise<TripPlanOutput>;

  return _planTripFlow;
}

export async function planTrip(query: TripPlanInput, idToken: string): Promise<TripPlanOutput> {
  const isAuthenticated = await verifyFirebaseIdToken(idToken);
  if (!isAuthenticated) {
    throw new Error('Authentication required.');
  }
  return getPlanTripFlow()(query);
}
