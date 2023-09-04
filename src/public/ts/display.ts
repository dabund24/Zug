import {Journeys, Leg, Status, Warning, Location} from "hafas-client";
import {
    addClassToChildOfParent, dateDifference,
    printNotification,
    setHTMLOfChildOfParent, timeToString,
    unixToHoursString,
    unixToHoursStringShort
} from "./util.js";
import {getJourney, resetJourneys, saveJourney} from "./memorizer.js";

let journeyCounter: number;

export function displayJourneys(journeys: Journeys, start: string, end: string) {

    journeyCounter = 0;
    resetJourneys();

    const stationNames = document.getElementById("station-names")!.getElementsByClassName("station-name")
    stationNames.item(0)!.innerHTML = start;
    stationNames.item(1)!.innerHTML = end;

    if (journeys.journeys === undefined) {
        printNotification("Keine Verbindungen gefundem")
        return
    }

    const connectionsTarget = document.getElementById("connections")!
    connectionsTarget.replaceChildren()

    const journeySection = document.getElementById("journeys")!;
    const connectionTemplate = journeySection.querySelector("template")!.content;
    let toBeAdded;

    let journeysArray = journeys.journeys;

    for (let i = 0; i < journeysArray.length; i++) {
        toBeAdded = document.importNode(connectionTemplate, true)
        const journey = journeysArray[i];

        saveJourney(journey);
        let a = journeyCounter;
        toBeAdded.querySelector("button")!.onclick = function(){displayJourneyModal(a)};
        journeyCounter++;

        const firstLeg = journey.legs[0];
        const lastLeg = journey.legs[journey.legs.length - 1]
        const scheduledDeparture = firstLeg.plannedDeparture;
        const actualDeparture = firstLeg.departure;
        const scheduledArrival = lastLeg.plannedArrival;
        const actualArrival = lastLeg.arrival;

        setHTMLOfChildOfParent(toBeAdded, ".time--departure--scheduled", unixToHoursStringShort(scheduledDeparture))
        if (firstLeg.departureDelay !== undefined && firstLeg.departurePrognosisType !== null && firstLeg.departureDelay !== null) {
            setHTMLOfChildOfParent(toBeAdded, ".time--departure--actual", unixToHoursStringShort(actualDeparture))
            addClassToChildOfParent(toBeAdded, ".time--departure--actual", firstLeg.departureDelay <= 300 ? "on-time" : "delayed")
        }

        setHTMLOfChildOfParent(toBeAdded, ".time--arrival--scheduled", unixToHoursStringShort(scheduledArrival))
        if (lastLeg.arrivalDelay !== undefined && (lastLeg.arrivalPrognosisType !== null && lastLeg.arrivalDelay !== null)) {
            setHTMLOfChildOfParent(toBeAdded, ".time--arrival--actual", unixToHoursStringShort(actualArrival))
            addClassToChildOfParent(toBeAdded, ".time--arrival--actual", lastLeg.arrivalDelay <= 300 ? "on-time" : "delayed")
        }

        setConnectionLines(journey.legs, toBeAdded)

        connectionsTarget.append(toBeAdded)
    }
}

function setConnectionLines(legs: readonly Leg[], connectionToBeAdded: DocumentFragment) {
    const lineTemplate = connectionToBeAdded.querySelector("template")!.content
    const linesTarget = connectionToBeAdded.querySelector("button")!

    let lineToBeAdded;

    legs = legs.filter(leg => leg.line !== undefined)

    for (let i = 0; i < legs.length; i++) {
        lineToBeAdded = document.importNode(lineTemplate, true)

        let productClass = "connection-line--" + legs[i].line!.product;

        addClassToChildOfParent(lineToBeAdded, ".connection-line", productClass);

        if (legs.length < 5) {
            setHTMLOfChildOfParent(lineToBeAdded, ".connection-line-name", legs[i].line!.name)
        } else if (legs.length < 8) {
            setHTMLOfChildOfParent(lineToBeAdded, ".connection-line-name", legs[i].line!.productName)
        }

        linesTarget.append(lineToBeAdded)
    }

    return connectionToBeAdded;
}

export function displayJourneyModal(index: number) {
    const journey = getJourney(index);
    const modal = document.getElementById("connection-modal")!;

    setHTMLOfChildOfParent(modal, ".modal__title", journey.legs[0].origin!.name + " &longrightarrow; " + journey.legs[journey.legs.length - 1]!.destination!.name)

    const legsTarget = document.getElementById("modal__trips")!;
    legsTarget.replaceChildren()

    const legs = journey.legs//.filter(leg => leg.line !== undefined)

    for (let i = 0; i < legs.length; i++) {
        if (legs[i].walking) {
            let transferTime = "";
            if (legs[i - 1] !== undefined && legs[i + 1] !== undefined) {
                transferTime = timeToString(dateDifference(legs[i - 1].arrival!, legs[i + 1].departure!));
            }
            addWalkToModal(legs[i], legsTarget, transferTime)
        } else {
            if (legs[i - 1] !== undefined && legs[i] !== undefined && !legs[i - 1].walking) {
                let transferTime = timeToString(dateDifference(legs[i - 1].arrival!, legs[i].departure!));
                addWalkToModal(undefined, legsTarget, transferTime)
            }
            addLegToModal(legs[i], legsTarget)
        }
    }


    modal.style.setProperty("display", "flex")

}

function addWalkToModal(walk: Leg | undefined, legsTarget: HTMLElement, transferTime: string) {
    const walkTemplate = (<HTMLTemplateElement>document.getElementById("modal__walk-template")!).content
    const toBeAdded = document.importNode(walkTemplate, true)

    setHTMLOfChildOfParent(toBeAdded, ".transfer-time", transferTime)

    if (walk !== undefined) {
        let walkingTime = timeToString(dateDifference(walk.departure!, walk.arrival!));
        setHTMLOfChildOfParent(toBeAdded, ".modal__walk__text", walk.distance + "m Fußweg (ca. " + walkingTime + ")")
        if ((<any>walk.origin).location.latitude !== undefined && (<any>walk.destination).location.latitude !== undefined) {
            let originLocation: Location = (<any>walk.origin).location
            let destinationLocation: Location = (<any>walk.destination).location
            console.log(originLocation)
            const osmLink = "https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&from=" +
                originLocation.latitude + "%2C" + originLocation.longitude + "&to=" +
                destinationLocation.latitude + "%2C" + destinationLocation.longitude

            toBeAdded.querySelector(".modal__walk__text")!.setAttribute("href", osmLink)
        }

    } else {
        addClassToChildOfParent(toBeAdded, ".connection-line--walk", "connection-line--transfer")
    }

    legsTarget.append(toBeAdded)
}

function addLegToModal(leg: Leg, legsTarget: HTMLElement) {
    const legTemplate = (<HTMLTemplateElement>document.getElementById("modal__leg-template")!).content
    const toBeAdded = document.importNode(legTemplate, true)

    // line color and duration
    let productClass = "connection-line--" + leg.line!.product;
    addClassToChildOfParent(toBeAdded, ".connection-line--horizontal", productClass);
    setHTMLOfChildOfParent(toBeAdded, ".duration", timeToString(dateDifference(leg.departure!, leg.arrival!)));
    // departure
    setHTMLOfChildOfParent(toBeAdded, ".modal__departure", leg.origin?.name);
    if (leg.departurePlatform !== null) {
        setHTMLOfChildOfParent(toBeAdded, ".modal__departure-platform", "Gleis " + leg.departurePlatform)
        if (leg.departurePlatform !== leg.plannedDeparturePlatform) {
            addClassToChildOfParent(toBeAdded, ".modal__departure-platform", "delayed")
        }
    }
    setHTMLOfChildOfParent(toBeAdded, ".time--departure--scheduled", unixToHoursStringShort(leg.plannedDeparture))
    if (leg.departureDelay !== undefined && leg.departurePrognosisType !== null && leg.departureDelay !== null) {
        setHTMLOfChildOfParent(toBeAdded, ".time--departure--actual", unixToHoursStringShort(leg.departure))
        addClassToChildOfParent(toBeAdded, ".time--departure--actual", leg.departureDelay <= 300 ? "on-time" : "delayed")
    }

    // arrival
    setHTMLOfChildOfParent(toBeAdded, ".modal__arrival", leg.destination?.name);
    if (leg.arrivalPlatform !== null) {
        setHTMLOfChildOfParent(toBeAdded, ".modal__arrival-platform", "Gleis " + leg.arrivalPlatform)
        if (leg.arrivalPlatform !== leg.plannedArrivalPlatform) {
            addClassToChildOfParent(toBeAdded, ".modal__arrival-platform", "delayed")
        }
    }
    setHTMLOfChildOfParent(toBeAdded, ".time--arrival--scheduled", unixToHoursStringShort(leg.plannedArrival))
    if (leg.arrivalDelay !== undefined && leg.arrivalPrognosisType !== null && leg.arrivalDelay !== null) {
        setHTMLOfChildOfParent(toBeAdded, ".time--arrival--actual", unixToHoursStringShort(leg.arrival))
        addClassToChildOfParent(toBeAdded, ".time--arrival--actual", leg.arrivalDelay <= 300 ? "on-time" : "delayed")
    }

    setHTMLOfChildOfParent(toBeAdded, ".modal__line-info", leg.line?.name + " &rightarrow; " + leg.direction)

    if (leg.remarks !== undefined) {
        addLegInfoToModal(leg, toBeAdded)
    }

    legsTarget.append(toBeAdded);
}

function addLegInfoToModal(leg: Leg, legToBeAdded: DocumentFragment) {
    const infoTemplate = (<HTMLTemplateElement> legToBeAdded.querySelector(".modal__trip-info-template")).content
    const infosTarget = legToBeAdded.querySelector(".modal__trip-infos")!
    let remarks = leg.remarks!.concat()
    remarks.sort((a, b) => {
        if (a.type === "hint" && b.type !== "hint") {
            return 1
        } else {
            return -1
        }
    })


    for (let i = 0; i < remarks.length; i++) {
        const toBeAdded = document.importNode(infoTemplate, true)
        let remark = remarks[i]
        setHTMLOfChildOfParent(toBeAdded, ".modal__trip-info", remarks[i].text)
        if (remark.type !== "hint") {
            addClassToChildOfParent(toBeAdded, ".modal__trip-info", "delayed")
        }
        infosTarget.appendChild(toBeAdded)
    }
}
