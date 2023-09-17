import {HafasClient, Journey, Journeys, JourneysOptions} from "hafas-client";
import {JourneyNode, JourneyTree, TreeMatrixPair, ZugResponse} from "../public/ts/types.js"
import {respondErrorNoStations, respondErrorStations, respondHafasError, respondNoError} from "./responses.js";

let hafasClient: HafasClient

export async function getJourneys(stops: string[], opt: JourneysOptions, client: HafasClient): Promise<ZugResponse> {
    opt.routingMode = "REALTIME"
    opt.stopovers = true
    console.log(opt)
    hafasClient = client;
    let journeysArray: Journey[][] = [];

    let firstJourneysResponse: Journeys;
    try {
        firstJourneysResponse = await hafasClient.journeys(stops[0], stops[1], opt)
    } catch (err) {
        return respondHafasError(err, 0, 1)
    }

    if (firstJourneysResponse.journeys === undefined || firstJourneysResponse.journeys.length === 0) {
        return respondErrorStations("noConnections", 0, 1)
    }
    journeysArray.push(firstJourneysResponse.journeys.concat())

    let latestNext = getLatestArrivalFromJourneys(firstJourneysResponse.journeys)
    //console.log(latestNext)
    if (latestNext === undefined) {
        return respondErrorStations("missingField", 0, 1)
    }
    let latestArrival = latestNext;
    let earliestArrival = getEarliestArrivalFromJourney(firstJourneysResponse.journeys)
    //console.log(earliestArrival)
    if (earliestArrival !== null && earliestArrival !== undefined) {
        opt.departure = new Date(earliestArrival)
    }

    delete opt.arrival
    opt.routingMode = "FULL"
    for (let i = 1; i < stops.length - 1; i++) {

        let latestNext = getLatestArrivalFromJourneys(journeysArray[i - 1])
        //console.log(latestNext)
        if (latestNext === undefined) {
            return respondErrorStations("noConnections", i - 1, i)
        }
        let latestArrival = latestNext;

        delete opt.laterThan
        //console.log(opt)
        let journeysResponse: Journeys;
        try {
            journeysResponse = await hafasClient.journeys(stops[i], stops[i + 1], opt)
        } catch (err) {
            return respondHafasError(err, i, i + 1)
        }
        if (journeysResponse.journeys === undefined || journeysResponse.journeys.length === 0) {
            return respondErrorStations("noConnections", i, i + 1)
        }

        let remainingJourneys = await requestMoreJourneys(journeysResponse.laterRef!, stops[i], stops[i + 1], opt, new Date(latestArrival))
        if (remainingJourneys !== undefined) {
            journeysArray.push(journeysResponse.journeys.concat(remainingJourneys));
        }
        let earliestArrival = getEarliestArrivalFromJourney(journeysArray[i])
        if (earliestArrival !== undefined) {
            opt.departure = new Date(earliestArrival)
        }
    }

    let matrixCopy = []
    for (let i = 0; i < journeysArray.length; i++) {
        matrixCopy.push(journeysArray[i].slice())
    }
    //console.log("c of fc")

    const tree = journeyMatrixToJourneyTree(journeysArray)

    return respondNoError(tree)
    //return [journeyMatrixToJourneyTree(journeysArray), matrixCopy]
}

async function requestMoreJourneys(laterRef: string, from: string, to: string, opt: JourneysOptions, latest: Date): Promise<Journey[] | undefined> {
    //console.log("more with latest " + latest)
    //console.log("moreJourneys. latest:" + latest)
    let journeys: Journey[] = []
    opt.laterThan = laterRef
    delete opt.departure
    for (let i = 0; i < 5; i++) {
        //console.log(opt.laterThan)
        //console.log(opt)
        let laterResult = await hafasClient.journeys(from, to, opt).catch(err => {
            return undefined
        })
        //console.log(laterResult)
        if (laterResult?.journeys === undefined || laterResult.journeys.length === 0) {
            return undefined;
        }
        journeys = journeys.concat(laterResult.journeys)
        const laterResultLastLegDeparture = getLatestDepartureFromJourneys(laterResult.journeys)
        if (laterResultLastLegDeparture === undefined || new Date(laterResultLastLegDeparture).getTime() > latest.getTime()) {
            return journeys
        }
        opt.laterThan = laterResult.laterRef
    }
    return journeys
}

function getLatestArrivalFromJourneys(journeys: readonly Journey[] | Journey[]) {
    const lastJourney = journeys[journeys.length - 1]
    return lastJourney.legs[lastJourney.legs.length - 1].arrival;
}

function getLatestDepartureFromJourneys(journeys: readonly Journey[] | Journey[]) {
    const lastJourney = journeys[journeys.length - 1]
    return lastJourney.legs[0].departure;
}

function getEarliestArrivalFromJourney(journeys: readonly Journey[] | Journey[]) {
    const firstJourney = journeys[0]
    return firstJourney.legs[firstJourney.legs.length - 1].arrival
}

function journeyMatrixToJourneyTree(matrix: Journey[][]): JourneyTree {
    return {
        children: getNodesFromMatrix(matrix, new Date(8640000000000000), 0)!
    }
}

function getNodesFromMatrix(matrix: Journey[][], nextDeparture: Date, depth: number): JourneyNode[] | null {
    if (depth === matrix.length) {
        return null
    }

    const childNodes: JourneyNode[] = []
    const end = getLastMatchingJourneyIndex(nextDeparture, matrix[depth]);
    const children = matrix[depth].splice(0, end)

    for (let i = 0; i < children.length; i++) {
        let nextArrival: Date;
        if (i === children.length - 1) {
            nextArrival = nextDeparture;
        } else {
            const nextChild = children[i + 1];
            nextArrival = new Date(nextChild.legs[nextChild.legs.length - 1].arrival!)
        }

        const childNode: JourneyNode = {
            journey: children[i],
            children: getNodesFromMatrix(matrix, nextArrival, depth + 1)
        }
        childNodes.push(childNode)
    }
    return childNodes
}

function getLastMatchingJourneyIndex(nextJourneyDeparture: Date, journeysToCheck: Journey[]) {
    //console.log(nextJourneyDeparture + " and length is " + journeysToCheck.length)
    let endIndex = 0;
    while (endIndex < journeysToCheck.length && nextJourneyDeparture.getTime() > new Date(journeysToCheck[endIndex].legs[0].departure!).getTime()) {
        endIndex++;
    }
    //console.log(endIndex)
    return endIndex;
}
