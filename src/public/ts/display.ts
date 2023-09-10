import {Journeys, Journey, Leg, Location} from "hafas-client";
import {
    addClassToChildOfParent, dateDifference, dateToString,
    printNotification,
    setHTMLOfChildOfParent, timeToString,
    unixToHoursString,
    unixToHoursStringShort
} from "./util.js";
import {getJourney, resetJourneys, saveJourney, selectedJourney} from "./memorizer.js";
import {JourneyNode, JourneyTree} from "./types.js";

let journeyCounter: number;
const connectionTemplate = (<HTMLTemplateElement> document.getElementById("connection-template")).content

export function displayJourneyTree(tree: JourneyTree, stations: string[]) {
    journeyCounter = 0;
    resetJourneys()

    addStationNames(stations)
    const connectionsRootContainer = document.getElementById("connections-root-container")!
    connectionsRootContainer.replaceChildren()

    tree.children.forEach(node => {
        addJourneyNode(node, connectionsRootContainer)
    })

}

export function addJourneyNode(node: JourneyNode, parent: HTMLElement | DocumentFragment) {
    const newParent = displayJourney(node.journey, parent)
    //console.log(newParent)
    if (node.children === null) {
        return
    }
    node.children.forEach(child => addJourneyNode(child, newParent))
}

function addStationNames(stations: string[]) {
    console.log(stations)
    const target = document.getElementById("station-names")!
    target.replaceChildren()
    const template = (<HTMLTemplateElement>document.getElementById("station-template")).content
    let toBeAdded;

    for (let i = 0; i < stations.length; i++) {
        toBeAdded = document.importNode(template, true)
        setHTMLOfChildOfParent(toBeAdded, ".station-name", stations[i])
        target.append(toBeAdded)
    }
}

export function displayJourney(journey: Journey, connectionsTarget: HTMLElement | DocumentFragment): HTMLElement {

    /*if (journey === undefined) {
        printNotification("Keine Verbindungen gefundem")
        return
    }*/

    //connectionsTarget.replaceChildren()
/*
    const journeySection = document.getElementById("journeys")!;
    const connectionTemplate = journeySection.querySelector("template")!.content;
    let toBeAdded;

    let journeysArray = journeys;

    for (let i = 0; i < journeysArray.length; i++) {*/
    let toBeAdded = document.importNode(connectionTemplate, true)

    saveJourney(journey);
    let a = journeyCounter;
    toBeAdded.querySelector("button")!.onclick = function(){displayJourneyModal(a)};
    toBeAdded.querySelector(".connection-line-selectable")!.setAttribute("id", "connection-line-selectable-" + a)
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

    //console.log(children)
    connectionsTarget.append(toBeAdded)
    //console.log(connectionsTarget.lastChild)


    return (<HTMLElement>connectionsTarget.lastElementChild!.querySelector(".connections"))
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

let legCounter = 0;

export function displayJourneyModal(index: number) {
    legCounter = 0;
    document.getElementById("connection-line-selectable-" + index)!.classList.add("selectable--horizontal--active")
    const journey = getJourney(index);
    const modal = document.getElementById("connection-modal")!;

    setHTMLOfChildOfParent(modal, ".modal__title", journey.legs[0].origin!.name + " &longrightarrow; " + journey.legs[journey.legs.length - 1]!.destination!.name)
    setHTMLOfChildOfParent(modal, ".modal__connection-date", dateToString(journey.legs[0].departure!))
    setHTMLOfChildOfParent(modal, ".modal__connection-duration", timeToString(dateDifference(journey.legs[0].departure!, journey.legs[journey.legs.length - 1].arrival!)))

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
            legCounter++;
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
            const osmLink = "https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&from=" +
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
    } else {
        (<HTMLElement>toBeAdded.querySelector(".modal__trip-infos-container")).style.setProperty("display", "none")
    }

    legsTarget.append(toBeAdded);
}

function addLegInfoToModal(leg: Leg, legToBeAdded: DocumentFragment) {
    const infoTemplate = (<HTMLTemplateElement> legToBeAdded.querySelector(".modal__trip-info-template")).content
    const warningsTarget = legToBeAdded.querySelector(".modal__trip-warnings")!
    const hintsTarget = legToBeAdded.querySelector(".modal__trip-hints")!

    let remarks = leg.remarks!.concat()
    remarks.sort((a, b) => {
        if (a.type === "hint" && b.type !== "hint") {
            return 1
        } else {
            return -1
        }
    });

    if (remarks[0].type !== "hint") {
        (<HTMLElement>legToBeAdded.querySelector(".modal__trip-warnings-button-container")).style.setProperty("display", "block")
    }
    if (remarks[remarks.length - 1].type === "hint") {
        (<HTMLElement>legToBeAdded.querySelector(".modal__trip-hints-button-container")).style.setProperty("display", "block")
    }

    let a = legCounter;
    (<HTMLButtonElement>legToBeAdded.querySelector(".modal__trip-warnings-button")).onclick = function(){toggleLegWarnings(a)};
    (<HTMLButtonElement>legToBeAdded.querySelector(".modal__trip-hints-button")).onclick = function(){toggleLegHints(a)};


    for (let i = 0; i < remarks.length; i++) {
        const toBeAdded = document.importNode(infoTemplate, true)
        let remark = remarks[i]
        setHTMLOfChildOfParent(toBeAdded, ".modal__trip-info", remarks[i].text)
        if (remark.type !== "hint") {
            //addClassToChildOfParent(toBeAdded, ".modal__trip-info", "delayed")
            warningsTarget.appendChild(toBeAdded)
        } else {
            hintsTarget.appendChild(toBeAdded)
        }
    }
}

export function toggleLegWarnings(index: number) {
    let legContainer = <HTMLElement>document.getElementsByClassName("modal__trip")[index]
    let infosContainer = legContainer.querySelector(".modal__trip-infos-container")!
    if (infosContainer.getAttribute("data-warnings") === "true") {
        infosContainer.setAttribute("data-warnings", "false")
        legContainer.querySelector(".modal__trip-warnings-button-container")!.classList.remove("selectable--horizontal--active")
    } else {
        infosContainer.setAttribute("data-warnings", "true")
        addClassToChildOfParent(legContainer, ".modal__trip-warnings-button-container", "selectable--horizontal--active")
    }
}

export function toggleLegHints(index: number) {
    let legContainer = <HTMLElement>document.getElementsByClassName("modal__trip")[index]
    let infosContainer = legContainer.querySelector(".modal__trip-infos-container")!
    if (infosContainer.getAttribute("data-hints") === "true") {
        infosContainer.setAttribute("data-hints", "false")
        legContainer.querySelector(".modal__trip-hints-button-container")!.classList.remove("selectable--horizontal--active")
    } else {
        infosContainer.setAttribute("data-hints", "true")
        addClassToChildOfParent(legContainer, ".modal__trip-hints-button-container", "selectable--horizontal--active")
    }
}

export function hideConnectionModal() {
    document.getElementById("connection-modal")!.style.setProperty("display", "none")
    document.getElementById("connection-line-selectable-" + selectedJourney)!.classList.remove("selectable--horizontal--active")
}

export function showSettingsModal() {
    document.getElementById("settings-modal")!.style.setProperty("display", "flex")
}

export function hideSettingsModal() {
    document.getElementById("settings-modal")!.style.setProperty("display", "none")
}
