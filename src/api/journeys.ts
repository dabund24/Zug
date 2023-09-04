import {HafasClient, Journey, Journeys} from "hafas-client";

export async function getJourneys(from: string, to: string, client: HafasClient): Promise<Journeys> {
    return await client.journeys(from, to, {results: 20, language: "de"})
}