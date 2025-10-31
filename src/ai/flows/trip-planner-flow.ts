
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
    prompt: `You are an expert at parsing user requests for carpooling. Extract the departure location, destination location, and date from the user's query.

    The user's query is in French. All extracted locations should be in Canada, likely in Québec.
    
    If the user mentions "demain" (tomorrow), "après-demain" (day after tomorrow), or a day of the week, calculate the correct date in YYYY-MM-DD format.
    
    User query: {{{prompt}}}
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

// This is the only function exported for the client to use. It's async, so it's valid.
export async function planTrip(query: TripPlanInput): Promise<TripPlanOutput> {
  return planTripFlow(query);
}
