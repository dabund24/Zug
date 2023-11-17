import {
    getJourney,
    selectedJourney,
    selectedJourneys,
    setSelectedJourney
} from "./memorizer.js";
import {dateDifference, numberWithSign, timeToString, unixToHoursStringShort} from "./util.js";
import {Journey} from "hafas-client";
import {displayJourney, displayJourneyModalFirstTime} from "./display.js";
import {shareJourney} from "./main.js";

export function selectJourney(depth: number, idInDepth: number) {
    console.log("depth: " + depth)
    console.log("id: " + idInDepth)
    const stationNameContainer = document.getElementsByClassName("station-name-container")[depth]
    const stationNameContainerNext = document.getElementsByClassName("station-name-container")[depth + 1]
    if (idInDepth === selectedJourneys[depth]) {
        stationNameContainer.classList.remove("station--selected")
        document.getElementById("connection-line-selectable-" + depth + "-" + idInDepth)!.classList.remove("selectable--horizontal--active")
        selectedJourneys[depth] = -1
        const bounds = getJourneyBounds()
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

    const bounds = getJourneyBounds()
    stationNameContainer.classList.add("station--selected")
}

export function getJourneyBounds(): [number, number] {
    let start = -1
    let end = -1
    console.log("len: " + selectedJourneys.length)
    for (let i = 0; i < selectedJourneys.length; i++) {
        console.log(selectedJourneys[i])
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

    const shareButton = document.getElementById("share-indicator")!
    const modalButton = document.getElementById("connection-modal-indicator")!
    console.log(start)
    if (start === -1) { // invalid bounds
        document.querySelector("footer")!.classList.remove("valid-journey")
    } else {
        document.querySelector("footer")!.classList.add("valid-journey")
        shareButton.querySelector("button")!.onclick = () => shareJourney([start, end])
        modalButton.querySelector("button")!.onclick = () => {
            displayJourneyModalFirstTime([start, end], true)
        }
    }
    displayFooterInfoPanel([start, end])
    return [start, end]
}

export function mergeSelectedJourneys(journeyBounds: [number, number]) {
    const mergedJourney: Journey = {
        type: "journey",
        legs: []
    }
    const refreshTokens: string[] = []
    for (let i = journeyBounds[0]; i <= journeyBounds[1]; i++) {
        const journey = getJourney(i, selectedJourneys[i])
        mergedJourney.legs = mergedJourney.legs.concat(journey.legs)
        if (journey.refreshToken !== undefined) {
            refreshTokens.push(journey.refreshToken)
        }
    }
    mergedJourney.refreshToken = JSON.stringify(refreshTokens)
    console.log(mergedJourney)
    setSelectedJourney(mergedJourney)
}

function displayFooterInfoPanel(journeyBounds: [number, number]) {
    if (journeyBounds[0] === -1) {
        return
    }
    const firstLeg = getJourney(journeyBounds[0], selectedJourneys[journeyBounds[0]]).legs[0]
    const departure = firstLeg.departure!
    const origin = <string>firstLeg.origin?.name
    const lastJourney = getJourney(journeyBounds[1], selectedJourneys[journeyBounds[1]])
    const lastLeg = lastJourney.legs[lastJourney.legs.length -1]
    const arrival = lastLeg.arrival!
    const destination = <string>lastLeg.destination?.name
    document.getElementById("footer__info-panel__origin")!.innerText = origin
    document.getElementById("footer__info-panel__destination")!.innerText = destination
    document.getElementById("footer__info-panel__duration")!.innerText = timeToString(dateDifference(departure, arrival))
}