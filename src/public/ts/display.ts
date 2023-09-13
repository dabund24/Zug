import {Journey, Leg, Location, StopOver} from "hafas-client";
import {
    addClassToChildOfParent, dateDifference, dateToString, numberWithSign,
    setHTMLOfChildOfParent, timeToString,
    unixToHoursStringShort
} from "./util.js";
import {getJourney, resetJourneys, saveJourney, selectedJourney} from "./memorizer.js";
import {JourneyNode, JourneyTree, LoadFactor} from "./types.js";
import {toast} from "./pageActions.js";

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
        setHTMLOfChildOfParent(toBeAdded, ".modal__departure-platform", getPlatformHTML(leg.departurePlatform))
        if (leg.departurePlatform !== leg.plannedDeparturePlatform) {
            addClassToChildOfParent(toBeAdded, ".modal__departure-platform", "delayed")
        }
    }
    setHTMLOfChildOfParent(toBeAdded, ".time--departure--scheduled", unixToHoursStringShort(leg.plannedDeparture))
    if (leg.departureDelay !== undefined && leg.departurePrognosisType !== null && leg.departureDelay !== null) {
        setHTMLOfChildOfParent(toBeAdded, ".time--departure--actual", unixToHoursStringShort(leg.departure))
        addClassToChildOfParent(toBeAdded, ".time--departure--actual", leg.departureDelay <= 300 ? "on-time" : "delayed")
        setHTMLOfChildOfParent(toBeAdded, ".modal__departure-delay", " (" + numberWithSign(leg.departureDelay / 60) + ")")
        addClassToChildOfParent(toBeAdded, ".modal__departure-delay", leg.departureDelay <= 300 ? "on-time" : "delayed")
    }

    // arrival
    setHTMLOfChildOfParent(toBeAdded, ".modal__arrival", leg.destination?.name);
    if (leg.arrivalPlatform !== null) {
        setHTMLOfChildOfParent(toBeAdded, ".modal__arrival-platform", getPlatformHTML(leg.arrivalPlatform))
        if (leg.arrivalPlatform !== leg.plannedArrivalPlatform) {
            addClassToChildOfParent(toBeAdded, ".modal__arrival-platform", "delayed")
        }
    }
    setHTMLOfChildOfParent(toBeAdded, ".time--arrival--scheduled", unixToHoursStringShort(leg.plannedArrival))
    if (leg.arrivalDelay !== undefined && leg.arrivalPrognosisType !== null && leg.arrivalDelay !== null) {
        setHTMLOfChildOfParent(toBeAdded, ".time--arrival--actual", unixToHoursStringShort(leg.arrival))
        addClassToChildOfParent(toBeAdded, ".time--arrival--actual", leg.arrivalDelay <= 300 ? "on-time" : "delayed")
        setHTMLOfChildOfParent(toBeAdded, ".modal__arrival-delay", " (" + numberWithSign(leg.arrivalDelay / 60) + ")")
        addClassToChildOfParent(toBeAdded, ".modal__arrival-delay", leg.arrivalDelay <= 300 ? "on-time" : "delayed")
    }

    setHTMLOfChildOfParent(toBeAdded, ".modal__line-info__text", leg.line?.name + " &rightarrow; " + leg.direction)
    const a = legCounter;
    (<HTMLButtonElement>toBeAdded.querySelector(".modal__line-info__text")).onclick = function(){toggleStopovers(a)};

    if (leg.stopovers !== undefined) {
        addStopoversToModal(leg.stopovers, toBeAdded)
    }

    if (leg.remarks !== undefined) {
        addLegInfoToModal(leg, toBeAdded)
    }
    addStaticLegInfoToModal(leg, toBeAdded);

    legsTarget.append(toBeAdded);
}

function addStopoversToModal(stopovers: readonly StopOver[], legToBeAdded: DocumentFragment) {
    const stopoverTemplate = (<HTMLTemplateElement>legToBeAdded.querySelector(".stopover-template")!).content
    const stopoverTarget = legToBeAdded.querySelector(".modal__line-stopovers")!

    for (let i = 1; i < stopovers.length - 1; i++) {
        const stopover = stopovers[i]
        const stopoverToBeAdded = document.importNode(stopoverTemplate, true)
        if (stopover.arrival !== undefined && stopover.arrival !== null) {
            setHTMLOfChildOfParent(stopoverToBeAdded, ".time--stopover--arrival", unixToHoursStringShort(stopover.arrival))
            if (stopover.arrivalDelay !== undefined && stopover.arrivalPrognosisType !== undefined && stopover.arrivalDelay !== null) {
                addClassToChildOfParent(stopoverToBeAdded, ".time--stopover--arrival", stopover.arrivalDelay <= 300 ? "on-time" : "delayed")
                addClassToChildOfParent(stopoverToBeAdded, ".stopover__delay", stopover.arrivalDelay <= 300 ? "on-time" : "delayed")
                setHTMLOfChildOfParent(stopoverToBeAdded, ".stopover__delay", " (" + numberWithSign(stopover.arrivalDelay / 60) + ")")
            }
        }
        if (stopover.departure !== undefined && stopover.departure !== null) {
            setHTMLOfChildOfParent(stopoverToBeAdded, ".time--stopover--departure", unixToHoursStringShort(stopover.departure))
            if (stopover.departureDelay !== undefined && stopover.departurePrognosisType !== undefined && stopover.arrivalDelay !== null) {
                addClassToChildOfParent(stopoverToBeAdded, ".time--stopover--departure", stopover.departureDelay <= 300 ? "on-time" : "delayed")
            }
        }
        setHTMLOfChildOfParent(stopoverToBeAdded, ".stopover__name", stopover.stop?.name)
        setHTMLOfChildOfParent(stopoverToBeAdded, ".stopover__platform", getPlatformHTML(stopover.arrivalPlatform))
        stopoverTarget.append(stopoverToBeAdded)
    }
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

function addStaticLegInfoToModal(leg: Leg, legToBeAdded: DocumentFragment) {
    let hasInfo = false
    const infoTemplate = (<HTMLTemplateElement> legToBeAdded.querySelector(".modal__trip-info-template")).content
    const target = legToBeAdded.querySelector(".modal__trip-static-infos")!
    if (leg.loadFactor !== undefined) {
        const loadFactor = ({
            "low-to-medium": "<span class='de on-time'>gering</span><span class='en on-time'>low</span>",
            "high": "<span class='de warning'>mittel</span><span class='en warning'>medium</span>",
            "very-high": "<span class='de delayed'>hoch</span><span class='en delayed'>high</span>",
            "exceptionally-high": "<span class='de delayed'>außergewöhnlich hoch</span><span class='en delayed'>exceptionally high</span>"
        })[<LoadFactor>leg.loadFactor]
        addInfoToTarget(target, infoTemplate, "<span class='de'>Auslastung</span><span class='en'>load</span>: " + loadFactor)
        hasInfo = true
    }
    if (leg.line?.operator !== undefined) {
        addInfoToTarget(target, infoTemplate, "<span class='de'>Betreiber</span><span class='en'>operator</span>: " + leg.line.operator.name)
        hasInfo = true
    }
    if (leg.cycle?.min !== undefined && leg.cycle.max !== undefined) {
        addInfoToTarget(target, infoTemplate, "<span class='de'>fährt alle</span><span class='en'>every</span> " + (leg.cycle.min / 60)
            + " <span class='de'>bis</span><span class='en'>to</span> " + (leg.cycle.max / 60)
            + " <span class='de'>Minuten</span><span class='en'>minutes</span>")
        hasInfo = true
    }
    if (leg.line?.fahrtNr !== undefined) {
        addInfoToTarget(target, infoTemplate, "<span class='de'>Fahrtnummer</span><span class='en'>train number</span>: " + leg.line.fahrtNr)
        hasInfo = true
    }
    console.log(hasInfo)
    if (hasInfo) {
        const a = legCounter;
        (<HTMLButtonElement>legToBeAdded.querySelector(".modal__trip-static-infos-button")).onclick = function(){toggleStaticInfoWarnings(a)};
        (<HTMLElement>legToBeAdded.querySelector(".modal__trip-static-infos-button-container")).style.setProperty("display", "block")
    }
}

function addInfoToTarget(target: Element, template: DocumentFragment, text: string) {
    const info = document.importNode(template, true)
    setHTMLOfChildOfParent(info, ".modal__trip-info", text)
    target.append(info)
}

function toggleStopovers(index: number) {
    const legContainer = <HTMLElement>document.getElementsByClassName("modal__trip")[index]
    const stopoversContainer = legContainer.querySelector(".modal__line-stopovers")!
    if (stopoversContainer.getAttribute("data-stopovers") === "true") {
        stopoversContainer.setAttribute("data-stopovers", "false")
        legContainer.querySelector(".modal__line-info")!.classList.remove("selectable--horizontal--active");
        (<HTMLElement>legContainer.querySelector(".duration")).style.setProperty("display", "block")
    } else {
        stopoversContainer.setAttribute("data-stopovers", "true")
        addClassToChildOfParent(legContainer, ".modal__line-info", "selectable--horizontal--active");
        (<HTMLElement>legContainer.querySelector(".duration")).style.setProperty("display", "none")
    }
}

export function toggleLegWarnings(index: number) {
    const legContainer = <HTMLElement>document.getElementsByClassName("modal__trip")[index]
    const infosContainer = legContainer.querySelector(".modal__trip-infos-container")!
    if (infosContainer.getAttribute("data-warnings") === "true") {
        infosContainer.setAttribute("data-warnings", "false")
        legContainer.querySelector(".modal__trip-warnings-button-container")!.classList.remove("selectable--horizontal--active")
    } else {
        infosContainer.setAttribute("data-warnings", "true")
        addClassToChildOfParent(legContainer, ".modal__trip-warnings-button-container", "selectable--horizontal--active")
    }
}

function toggleStaticInfoWarnings(index: number) {
    const legContainer = <HTMLElement>document.getElementsByClassName("modal__trip")[index]
    const infosContainer = legContainer.querySelector(".modal__trip-infos-container")!
    if (infosContainer.getAttribute("data-static-infos") === "true") {
        infosContainer.setAttribute("data-static-infos", "false")
        legContainer.querySelector(".modal__trip-static-infos-button-container")!.classList.remove("selectable--horizontal--active")
    } else {
        infosContainer.setAttribute("data-static-infos", "true")
        addClassToChildOfParent(legContainer, ".modal__trip-static-infos-button-container", "selectable--horizontal--active")
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

export function getPlatformHTML(platform: number | string | undefined) {
    if (platform === undefined || platform === null) {
        return ""
    }
    return "<span class='de'>Gl.</span><span class='en'>Pl.</span> " + platform
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
    toast("success", "Einstellungen gespeichert")
}
