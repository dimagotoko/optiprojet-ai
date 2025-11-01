
'use server';
/**
 * @fileOverview An AI flow to parse natural language queries for trip planning.
 *
 * - planTrip - A function that handles parsing the user's query.
 * - TripPlanInputSchema - The input type for the planTrip function.
 * - TripPlanOutputSchema - The return type for the planTrip function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// We define the schemas here, but we don't export them directly.
const TripPlanInputSchema = z.string().describe('A natural language query from a user looking for a carpool ride.');
const TripPlanOutputSchema = z.object({
    departure: z.string().optional().describe('The starting location or city for the trip.'),
    destination: z.string().optional().describe('The ending location or city for the trip.'),
    date: z.string().optional().describe("The desired date for the trip. Should be in YYYY-MM-DD format. Determine the date based on the current date, which is {{request.time}}"),
    isComplete: z.boolean().describe('Set to true if both departure and destination are extracted. Otherwise, set to false.'),
    missingInfo: z.enum(['departure', 'destination', 'date', 'none']).describe('If isComplete is false, specify which piece of information is missing. If the query is ambiguous, ask for both departure and destination.'),
});


// We export the types, which is allowed.
export type TripPlanInput = z.infer<typeof TripPlanInputSchema>;
export type TripPlanOutput = z.infer<typeof TripPlanOutputSchema>;


const prompt = ai.definePrompt(
  {
    name: 'tripPlanPrompt',
    // We use the schemas here for the prompt definition.
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
    // SECURITY NOTE: This flow is intentionally public to allow new users to try the AI search feature.
    // For flows that modify data or access private information, you should protect them
    // by uncommenting the following lines:
    // const { user } = await requireUser();
    // if (!user) {
    //   throw new Error("Authentication required.");
    // }
    
    const { output } = await prompt(query);
    return output!;
  }
);

// This is the only function exported for the client to use. It's async, so it's valid.
export async function planTrip(query: TripPlanInput): Promise<TripPlanOutput> {
  return planTripFlow(query);
}

