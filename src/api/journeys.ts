import {HafasClient, Journey, Journeys, JourneysOptions} from "hafas-client";

export async function getJourneys(from: string, to: string, opt: JourneysOptions, client: HafasClient): Promise<Journeys> {
    opt.results = 20
    opt.language = "de"
    return await client.journeys(from, to, opt).catch(err => {
        return {}
    })
}