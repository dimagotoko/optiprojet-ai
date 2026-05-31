
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { firebaseConfig } from '@/firebase/config';

const TripPlanInputSchema = z.string().describe('A natural language query from a user looking for a carpool ride.');
const TripPlanOutputSchema = z.object({
    departure: z.string().optional().describe('The starting location or city for the trip.'),
    destination: z.string().optional().describe('The ending location or city for the trip.'),
    date: z.string().optional().describe("The desired date for the trip. Should be in YYYY-MM-DD format. Determine the date based on the current date, which is {{request.time}}"),
    isComplete: z.boolean().describe('Set to true if both departure and destination are extracted. Otherwise, set to false.'),
    missingInfo: z.enum(['departure', 'destination', 'date', 'none']).describe('If isComplete is false, specify which piece of information is missing. If the query is ambiguous, ask for both departure and destination.'),
});

export type TripPlanInput = z.infer<typeof TripPlanInputSchema>;
export type TripPlanOutput = z.infer<typeof TripPlanOutputSchema>;

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

const prompt = ai.definePrompt(
  {
    name: 'tripPlanPrompt',
    input: { schema: TripPlanInputSchema },
    output: { schema: TripPlanOutputSchema },
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

const planTripFlow = ai.defineFlow(
  {
    name: 'planTripFlow',
    inputSchema: TripPlanInputSchema,
    outputSchema: TripPlanOutputSchema,
  },
  async (query) => {
    const { output } = await prompt(query);
    return output!;
  }
);

export async function planTrip(query: TripPlanInput, idToken: string): Promise<TripPlanOutput> {
  const isAuthenticated = await verifyFirebaseIdToken(idToken);
  if (!isAuthenticated) {
    throw new Error('Authentication required.');
  }
  return planTripFlow(query);
}
