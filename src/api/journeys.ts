import {HafasClient, Journey, JourneysOptions} from "hafas-client";
import {isZugError, JourneyNode, JourneyTree, TreeMatrixPair, ZugError} from "../public/ts/types.js"

let hafasClient: HafasClient

export async function getJourneys(stops: string[], opt: JourneysOptions, client: HafasClient): Promise<TreeMatrixPair | ZugError> {
    console.log(opt)
    hafasClient = client;
    //opt.results = 20
    //opt.language = "de"
    let journeysArray: Journey[][] = [];

    // journeys from -> vias[0]

    let firstJourneysResponse = await hafasClient.journeys(stops[0], stops[1], opt).catch((err) => {
        return undefined
    });
    //console.log(firstJourneysResponse)
    if (firstJourneysResponse === undefined || firstJourneysResponse.journeys === undefined) {
        return "error"
    }
    journeysArray.push(firstJourneysResponse.journeys.concat())

    let latestNext = getLatestArrivalFromJourneys(firstJourneysResponse.journeys)
    //console.log(latestNext)
    if (latestNext === undefined) {
        return "error"
    }
    let latestArrival = latestNext;
    let earliestArrival = getEarliestArrivalFromJourney(firstJourneysResponse.journeys)
    //console.log(earliestArrival)
    if (earliestArrival !== null && earliestArrival !== undefined) {
        opt.departure = new Date(earliestArrival)
    }

    for (let i = 1; i < stops.length - 1; i++) {

        let latestNext = getLatestArrivalFromJourneys(journeysArray[i - 1])
        //console.log(latestNext)
        if (latestNext === undefined) {
            return "error"
        }
        let latestArrival = latestNext;

        delete opt.laterThan
        //console.log(opt)
        let journeysResponse = await hafasClient.journeys(stops[i], stops[i + 1], opt).catch(err => {
            return undefined
        });
        if (journeysResponse === undefined || journeysResponse.journeys === undefined) {
            return "noConnections"
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

    //const tree = journeyMatrixToJourneyTree(journeysArray)

    return [journeyMatrixToJourneyTree(journeysArray), matrixCopy]
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
        if (laterResult === undefined || laterResult.journeys === undefined || laterResult.journeys.length === 0) {
            return undefined;
        }
        journeys = journeys.concat(laterResult.journeys)
        const laterResultLastLegDeparture = getLatestDepartureFromJourneys(laterResult.journeys)
        //console.log("letzte Abfahrt: " + laterResultLastLegDeparture)
        if (laterResultLastLegDeparture === undefined || new Date(laterResultLastLegDeparture).getTime() > latest.getTime()) {
            //console.log(laterResultLastLegDeparture)
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
    let ea = firstJourney.legs[firstJourney.legs.length - 1].arrival
    //console.log(ea + " in " + firstJourney.legs[firstJourney.legs.length - 1].plannedArrival)
    return ea
}

function journeyMatrixToJourneyTree(matrix: Journey[][]): JourneyTree {
    return {
        children: getNodesFromMatrix(matrix, new Date(8640000000000000), 0)!
    }
}

function getNodesFromMatrix(matrix: Journey[][], nextDeparture: Date, depth: number): JourneyNode[] | null {
    //console.log("depth: " + depth + ", nextDep: " + nextDeparture)
    //console.log(matrix)
    if (depth === matrix.length) {
        return null
    }
    //console.log("matrLen: " + matrix[depth].length)

    let childNodes: JourneyNode[] = []

    let end = getLastMatchingJourneyIndex(nextDeparture, matrix[depth]);

    let children = matrix[depth].splice(0, end)
    //console.log("end")
    //console.log("oldLength: " + matrix[depth].length)
    //matrix[depth] = matrix[depth].slice(0, end)
    //console.log("newLength: " + matrix[depth].length)

    for (let i = 0; i < children.length; i++) {
        let nextArrival: Date;
        if (i === children.length - 1) {
            nextArrival = nextDeparture;
        } else {
            const nextChild = children[i + 1];
            nextArrival = new Date(nextChild.legs[nextChild.legs.length - 1].arrival!)
            //console.log("next arr: " + nextArrival)
        }

        let childNode: JourneyNode = {
            journey: children[i],
            children: getNodesFromMatrix(matrix, nextArrival, depth + 1)
        }
        childNodes.push(childNode)
        //console.log(childNode)
    }
    return childNodes
}

/**
 *
 * @param nextJourneyDeparture
 * @param journeysToCheck
 */
function getLastMatchingJourneyIndex(nextJourneyDeparture: Date, journeysToCheck: Journey[]) {
    //console.log(nextJourneyDeparture + " and length is " + journeysToCheck.length)
    let endIndex = 0;
    while (endIndex < journeysToCheck.length && nextJourneyDeparture.getTime() > new Date(journeysToCheck[endIndex].legs[0].departure!).getTime()) {
        endIndex++;
    }
    //console.log(endIndex)
    return endIndex;
}
