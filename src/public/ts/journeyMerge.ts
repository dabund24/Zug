import {
    displayedDiagramData,
    getJourney, journeyBounds, searchInputValues,
    selectedJourney,
    selectedJourneys, setJourneyBounds,
    setSelectedJourney, settings
} from "./memorizer";
import {addClassToChildOfParent, dateDifference, timeToString, unixToHoursStringShort} from "./util";
import {Journey, Station, Stop, Location, Leg} from "hafas-client";
import {findConnections} from "./main";
import {legsShareTransfer} from "./map";
import {parseStationStopLocation} from "./search";
import {sharePage} from "./pageActions";

export function selectJourney(depth: number, idInDepth: number) {
    console.log("depth: " + depth)
    console.log("id: " + idInDepth)
    const stationNameContainer = document.getElementsByClassName("station-name-container")[depth]
    const stationNameContainerNext = document.getElementsByClassName("station-name-container")[depth + 1]
    if (idInDepth === selectedJourneys[depth]) {
        stationNameContainer.classList.remove("station--selected")
        document.getElementById("connection-line-selectable-" + depth + "-" + idInDepth)!.classList.remove("selectable--horizontal--active")
        selectedJourneys[depth] = -1
        const bounds = calculateJourneyBounds()
        mergeSelectedJourneys()
        console.log(bounds)
        return
    }

    document.getElementById("connection-line-selectable-" + depth + "-" + idInDepth)!.classList.add("selectable--horizontal--active")
    if (selectedJourneys[depth] !== -1) {
        document.getElementById("connection-line-selectable-" + depth + "-" + selectedJourneys[depth])!.classList.remove("selectable--horizontal--active")
    }
    selectedJourneys[depth] = idInDepth
    const journey = getJourney(depth, idInDepth)
    stationNameContainer
        .querySelector(".station-name__durations__leg")!
        .innerHTML = timeToString(dateDifference(journey.legs[0].departure!, journey.legs[journey.legs.length - 1].arrival!))

    const thisJourneyFirstLegDeparture = journey.legs[0].departure

    if (depth > 0 && selectedJourneys[depth - 1] !== -1) { // transfer time before journey
        const priorJourney = getJourney(depth - 1, selectedJourneys[depth - 1])
        const priorJourneyLastLegArrival = priorJourney.legs[priorJourney.legs.length - 1].arrival
        if (priorJourneyLastLegArrival !== undefined && thisJourneyFirstLegDeparture !== undefined) { // transfer time
            const transferTime = timeToString(dateDifference(priorJourneyLastLegArrival, thisJourneyFirstLegDeparture))
            const transferTimeTarget = stationNameContainer
                .querySelector(".station-name__durations__wait")!
            transferTimeTarget.innerHTML = transferTime
            if (transferTime.startsWith("-")) {
                transferTimeTarget.classList.add("delayed")
            } else {
                transferTimeTarget.classList.remove("delayed")
            }
        }
    }
    if (thisJourneyFirstLegDeparture !== undefined) { // departure of journey
        const departure = unixToHoursStringShort(thisJourneyFirstLegDeparture)
        const departureTarget = stationNameContainer.querySelector(".station-name__durations__departure")!
        departureTarget.innerHTML = departure
    }

    const thisJourneyLastLegArrival = journey.legs[journey.legs.length - 1].arrival
    if (depth < selectedJourneys.length - 1 && selectedJourneys[depth + 1] !== -1) { // transfer time after journey
        const nextJourney = getJourney(depth + 1, selectedJourneys[depth + 1])
        const nextJourneyFirstLegDeparture = nextJourney.legs[0].departure
        if (thisJourneyLastLegArrival !== undefined && nextJourneyFirstLegDeparture !== undefined) {
            const transferTime = timeToString(dateDifference(thisJourneyLastLegArrival, nextJourneyFirstLegDeparture))
            const transferTimeTarget = document.getElementsByClassName("station-name-container")[depth + 1]
                .querySelector(".station-name__durations__wait")!
            transferTimeTarget.innerHTML = transferTime
            if (transferTime.startsWith("-")) {
                transferTimeTarget.classList.add("delayed")
            } else {
                transferTimeTarget.classList.remove("delayed")
            }
        }
    }
    if (thisJourneyLastLegArrival !== undefined) { // arrival of journey
        const arrival = unixToHoursStringShort(thisJourneyLastLegArrival)
        const arrivalTarget = stationNameContainerNext.querySelector(".station-name__durations__arrival")!
        arrivalTarget.innerHTML = arrival
    }

    calculateJourneyBounds()
    addStopoversToStationNames(stationNameContainer.querySelector(".station-name__connector")!, journey, depth)
    stationNameContainer.classList.add("station--selected")
    mergeSelectedJourneys()
}

function addStopoversToStationNames(target: HTMLElement, journey: Journey, index: number) {
    target.replaceChildren()
    const template = (<HTMLTemplateElement> document.getElementById("station-name__line__stopover-template")).content
    journey.legs.forEach(leg => {
        if (leg.walking === true) {
            return;
        }
        const toBeAdded = document.importNode(template, true)
        const productClass = "connection-line--" + leg.line?.product!;
        addClassToChildOfParent(toBeAdded, ".connection-line", productClass)

        const origin = parseStationStopLocation(leg.origin!)
        const stopoverContainer = <HTMLButtonElement> toBeAdded.querySelector(".station-icon-container")!
        stopoverContainer.setAttribute("data-tooltip-content", origin.name)
        stopoverContainer.onclick = () => {
            const diagramData = displayedDiagramData
            diagramData.stations!.vias.splice(index, 0, origin)
            diagramData.options = settings.journeysSettings
            findConnections(diagramData)
        }

        toBeAdded.querySelector(".station-name__connector__line-container")!.setAttribute("data-tooltip-content", <string> leg.line?.name)
        target.append(toBeAdded)
    })
}

export function calculateJourneyBounds(): [number, number] {
    let start = -1
    let end = -1
    for (let i = 0; i < selectedJourneys.length; i++) {
        if (start === -1 && end === -1 &&  selectedJourneys[i] !== -1) {
            start = i
        } else if (start !== -1 && end === -1 && selectedJourneys[i] === -1) {
            end = i - 1
        } else if (start !== -1 && end !== -1 && selectedJourneys[i] !== -1) {
            start = -1
            end = -1
            break
        }
    }
    if (start !== -1 && end === -1) {
        end = selectedJourneys.length - 1
    }

    const shareButton = <HTMLButtonElement>document.getElementById("share-button--desktop")!
    if (start === -1) { // invalid bounds
        document.querySelector("footer")!.classList.remove("valid-journey")
    } else {
        document.querySelector("footer")!.classList.add("valid-journey")
        shareButton.onclick = () => sharePage("journey")
    }
    setJourneyBounds([start, end])
    displayFooterInfoPanel([start, end])
    return [start, end]
}

export function mergeSelectedJourneys() {
    const bounds = journeyBounds
    if (bounds[0] == -1) {
        return
    }
    const mergedJourney: Journey = {
        type: "journey",
        legs: []
    }
    const refreshTokens: string[] = []
    for (let i = bounds[0]; i <= bounds[1]; i++) {
        const journey = getJourney(i, selectedJourneys[i])

        if (mergedJourney.legs.length > 0 && !legsShareTransfer(mergedJourney.legs.at(-1)!, journey.legs[0])) {
            mergedJourney.legs = mergedJourney.legs.concat(getMergingWalk(mergedJourney.legs.at(-1)!, journey.legs[0]))
        }

        mergedJourney.legs = mergedJourney.legs.concat(journey.legs)
        if (journey.refreshToken !== undefined) {
            refreshTokens.push(journey.refreshToken)
        }
    }
    mergedJourney.refreshToken = JSON.stringify(refreshTokens)
    console.log("merged")
    setSelectedJourney(mergedJourney)
}

function getMergingWalk(legA: Leg, legB: Leg): Leg {
    return {
        origin: legA.destination,
        destination: legB.origin,
        departure: legA.arrival,
        arrival: legB.departure,
        walking: true
    }
}

function displayFooterInfoPanel(journeyBounds: [number, number]) {
    if (journeyBounds[0] === -1) {
        return
    }
    const firstLeg = getJourney(journeyBounds[0], selectedJourneys[journeyBounds[0]]).legs[0]
    const departure = firstLeg.departure!
    const origin = parseStationStopLocation(firstLeg.origin!).name
    const lastJourney = getJourney(journeyBounds[1], selectedJourneys[journeyBounds[1]])
    const lastLeg = lastJourney.legs.at(-1)!
    const arrival = lastLeg.arrival!
    const destination = parseStationStopLocation(lastLeg.destination!).name
    document.getElementById("footer__info-panel__origin")!.innerText = origin
    document.getElementById("footer__info-panel__destination")!.innerText = destination
    document.getElementById("footer__info-panel__duration")!.innerText = timeToString(dateDifference(departure, arrival))
}
