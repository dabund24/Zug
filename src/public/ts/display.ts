import {Hint, Journey, Leg, Location, Status, StopOver, Warning} from "hafas-client";
import {findConnections} from "./main";
import {
    addClassToChildOfParent,
    dateDifference,
    dateToString,
    numberWithSign,
    setHTMLOfChildOfParent,
    timeToString,
    unixToHoursStringShort
} from "./util";
import {
    displayedDiagramData,
    journeyBounds,
    resetJourneys,
    saveJourney,
    selectedJourney, settings,
    tryLockingJourneySearch,
    unlockJourneySearch
} from "./memorizer";
import {JourneyNode, JourneyTree, LoadFactor, PageStateString, SearchObject} from "./types";
import {toast} from "./pageActions";
import {initMap} from "./map";
import {pushState} from "./routing";
import {selectJourney} from "./journeyMerge";
import {parseStationStopLocation} from "./search";

let journeyCounter: number;
const connectionTemplate = (<HTMLTemplateElement> document.getElementById("connection-template")).content

export function displayJourneyTree(tree: JourneyTree, treedepth: number) {
    journeyCounter = 0;
    resetJourneys(treedepth - 1)

    const connectionsRootContainer = document.getElementById("connections-root-container")!
    connectionsRootContainer.replaceChildren()

    tree.children.forEach(node => {
        addJourneyNode(node, connectionsRootContainer)
    })
    document.documentElement.setAttribute("data-vias", (treedepth - 2).toString())
    return journeyCounter
}

export function addJourneyNode(node: JourneyNode, parent: HTMLElement | DocumentFragment) {
    const newParent = displayJourney(node, parent)
    if (node.children === null) {
        return
    }
    node.children.forEach(child => addJourneyNode(child, newParent))
}

export function addStationNames(stations: SearchObject[]) {
    const target = document.getElementById("station-names")!
    target.replaceChildren()
    const template = (<HTMLTemplateElement>document.getElementById("station-name-template")).content
    let toBeAdded;

    for (let i = 0; i < stations.length; i++) {
        toBeAdded = document.importNode(template, true)
        setHTMLOfChildOfParent(toBeAdded, ".station-name__name", stations[i].name);
        const nameButton = <HTMLButtonElement> toBeAdded.querySelector(".station-name__name")
        const iconButton = <HTMLButtonElement> toBeAdded.querySelector(".station-icon-container")
        iconButton.classList.add(`mini-icon-container--${stations[i].type}`)
        if (i !== 0 && i !== stations.length - 1) {
            nameButton.onclick = () => removeStation(i - 1)
            iconButton.onclick = () => removeStation(i - 1)
        }
        target.append(toBeAdded)
    }
}

function removeStation(index: number) {
    const diagramData = displayedDiagramData
    diagramData.stations!.vias.splice(index, 1)
    diagramData.options = settings.journeysSettings
    findConnections(diagramData)
}

export function displayJourney(journeyNode: JourneyNode, connectionsTarget: HTMLElement | DocumentFragment): HTMLElement {

    const journey = journeyNode.journey
    const depth = journeyNode.depth
    const idInDepth = journeyNode.idInDepth
    let toBeAdded = document.importNode(connectionTemplate, true)

    saveJourney(depth, journey);
    let a = journeyCounter;
    toBeAdded.querySelector("button")!.onclick = function(){selectJourney(depth, idInDepth)};
    toBeAdded.querySelector(".connection-line-selectable")!.setAttribute("id", "connection-line-selectable-" + depth + "-" + idInDepth)
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

export function displayJourneyModalFirstTime(lockingNecessary: boolean) {
    if (lockingNecessary && !tryLockingJourneySearch()) {
        toast("warning", "Bitte warten...", "Please wait...")
        return
    }
    displayJourneyModal(selectedJourney)

    if (lockingNecessary) {
        unlockJourneySearch()
    }
}

export function displayJourneyModal(journey: Journey) {
    const subpage = document.getElementById("connection-subpage")!;
    legCounter = 0;

    setHTMLOfChildOfParent(subpage, ".modal__title", parseStationStopLocation(journey.legs[0].origin!).name + " — " + parseStationStopLocation(journey.legs.at(-1)!.destination!).name)
    setHTMLOfChildOfParent(subpage, ".modal__connection-date", dateToString(journey.legs[0].departure!))
    setHTMLOfChildOfParent(subpage, ".modal__connection-duration", timeToString(dateDifference(journey.legs[0].departure!, journey.legs[journey.legs.length - 1].arrival!)));

    const legsTarget = document.getElementById("modal__trips")!;
    legsTarget.replaceChildren()

    const legs = journey.legs

    for (let i = 0; i < legs.length; i++) {
        const leg = legs[i]
        if (leg.walking) {
            let transferTime = "";
            if (legs[i - 1] !== undefined && legs[i + 1] !== undefined && !legs[i - 1].walking && !legs[i + 1].walking) {
                transferTime = timeToString(dateDifference(legs[i - 1].arrival!, legs[i + 1].departure!));
            } else {
                transferTime = timeToString(dateDifference(leg.departure!, leg.arrival!))
            }
            if (leg.origin !== undefined && i === 0) {  // first leg is walk
                addLocationToModal(parseStationStopLocation(leg.origin), legsTarget, undefined, unixToHoursStringShort(leg.departure!))
            }
            addWalkToModal(leg, legsTarget, transferTime)
            if (leg.destination !== undefined && (i === legs.length - 1 || legs[i + 1].walking)) {  // walk before another walk or last leg is walk
                let departure: string | undefined = undefined
                if (legs[i + 1] !== undefined && legs[i + 1].walking && legs[i + 1].departure !== undefined && legs[i + 1].departure !== leg.arrival) {
                    departure = unixToHoursStringShort(legs[i + 1].departure)
                }
                addLocationToModal(parseStationStopLocation(leg.destination), legsTarget, unixToHoursStringShort(leg.arrival!), departure)
            }
        } else {
            if (legs[i - 1] !== undefined && !legs[i - 1].walking) {
                let transferTime = timeToString(dateDifference(legs[i - 1].arrival!, leg.departure!));
                addWalkToModal(undefined, legsTarget, transferTime)
            }
            addLegToModal(leg, legsTarget)
            legCounter++;
        }
    }
}

function addWalkToModal(walk: Leg | undefined, legsTarget: HTMLElement, transferTime: string) {
    const walkTemplate = (<HTMLTemplateElement>document.getElementById("modal__walk-template")!).content
    const toBeAdded = document.importNode(walkTemplate, true)

    setHTMLOfChildOfParent(toBeAdded, ".transfer-time", transferTime)

    if (walk !== undefined) {
        setHTMLOfChildOfParent(toBeAdded, ".modal__walk__text", getWalkHTML(walk))
        let originLocation: Location
        let destinationLocation: Location
        if (walk.origin?.type === "location") {
            originLocation = walk.origin
        } else {
            originLocation = walk.origin?.location!
        }

        if (walk.destination?.type === "location") {
            destinationLocation = walk.destination
        } else {
            destinationLocation = walk.destination?.location!
        }
        const osmLink = "https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&from=" +
            originLocation.latitude + "%2C" + originLocation.longitude + "&to=" +
            destinationLocation.latitude + "%2C" + destinationLocation.longitude

        toBeAdded.querySelector(".modal__walk__text")!.setAttribute("href", osmLink)
    } else {
        addClassToChildOfParent(toBeAdded, ".connection-line--walk", "connection-line--transfer")
    }

    legsTarget.append(toBeAdded)
}

function addLocationToModal(location: SearchObject, legsTarget: HTMLElement, arrival: string | undefined, departure: string | undefined) {
    const locationTemplate = (<HTMLTemplateElement>document.getElementById("modal__location-template")!).content
    const toBeAdded = document.importNode(locationTemplate, true)

    if (arrival !== undefined) {
        setHTMLOfChildOfParent(toBeAdded, ".time--arrival", arrival)
    }
    if (departure !== undefined) {
        setHTMLOfChildOfParent(toBeAdded, ".time--departure", departure)
    }

    addClassToChildOfParent(toBeAdded, ".mini-icon-container", `mini-icon-container--${location.type}`)
    setHTMLOfChildOfParent(toBeAdded, ".modal__location__text", location.name)

    legsTarget.append(toBeAdded)
}

function addLegToModal(leg: Leg, legsTarget: HTMLElement) {
    const legTemplate = (<HTMLTemplateElement>document.getElementById("modal__leg-template")!).content
    const toBeAdded = document.importNode(legTemplate, true)

    // line color and duration
    let productClass = "modal__trip--" + leg.line!.product;
    addClassToChildOfParent(toBeAdded, ".modal__trip", productClass);
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
            if (stopover.departureDelay !== undefined && stopover.departurePrognosisType !== undefined && stopover.departureDelay !== null) {
                addClassToChildOfParent(stopoverToBeAdded, ".time--stopover--departure", stopover.departureDelay <= 300 ? "on-time" : "delayed")
            }
        }
        setHTMLOfChildOfParent(stopoverToBeAdded, ".stopover__name", stopover.stop?.name)
        setHTMLOfChildOfParent(stopoverToBeAdded, ".stopover__platform", getPlatformHTML(stopover.arrivalPlatform))
        if (stopover.arrivalPlatform !== stopover.plannedArrivalPlatform) {
            addClassToChildOfParent(stopoverToBeAdded, ".stopover__platform", "delayed")
        }
        if (stopover.cancelled === true) {
            addClassToChildOfParent(stopoverToBeAdded, ".stopover__name", "cancelled")
        }
        // @ts-ignore
        if (stopover.additional === true) {
            addClassToChildOfParent(stopoverToBeAdded, ".stopover__name", "info")
        }
        stopoverTarget.append(stopoverToBeAdded)
    }
}

function addLegInfoToModal(leg: Leg, legToBeAdded: DocumentFragment) {
    const infoTemplate = (<HTMLTemplateElement> legToBeAdded.querySelector(".modal__trip-info-template")).content
    const statusesTarget = legToBeAdded.querySelector(".modal__trip-statuses")!
    const warningsTarget = legToBeAdded.querySelector(".modal__trip-warnings")!
    const hintsTarget = legToBeAdded.querySelector(".modal__trip-hints")!

    let remarks = leg.remarks!.concat()
    if (leg.stopovers?.[0]?.remarks !== undefined) {
        remarks = leg.stopovers[0].remarks.concat(remarks)
    }
    const finalRemarks = leg.stopovers?.[leg.stopovers?.length - 1]?.remarks
    if (finalRemarks !== undefined) {
        remarks = remarks.concat(finalRemarks)
    }

    const hints: (Hint | Status | Warning)[] = []
    const warnings: (Hint | Status | Warning)[] = []
    const statuses: (Hint | Status | Warning)[] = []

    remarks.forEach(remark => {
        switch (remark.type) {
            case "hint":
                hints.push(remark)
                break
            case "status":
                statuses.push(remark)
                break
            default:
                warnings.push(remark)
        }
    })

    if (hints.length !== 0) {
        (<HTMLElement>legToBeAdded.querySelector(".modal__trip-hints-button-container")).style.setProperty("display", "block")
    }
    if (warnings.length !== 0) {
        (<HTMLElement>legToBeAdded.querySelector(".modal__trip-warnings-button-container")).style.setProperty("display", "block")
    }
    if (statuses.length !== 0) {
        (<HTMLElement>legToBeAdded.querySelector(".modal__trip-statuses-button-container")).style.setProperty("display", "block")
    }

    let a = legCounter;
    (<HTMLButtonElement>legToBeAdded.querySelector(".modal__trip-statuses-button")).onclick = function(){toggleLegStatuses(a)};
    (<HTMLButtonElement>legToBeAdded.querySelector(".modal__trip-warnings-button")).onclick = function(){toggleLegWarnings(a)};
    (<HTMLButtonElement>legToBeAdded.querySelector(".modal__trip-hints-button")).onclick = function(){toggleLegHints(a)};

    statuses.forEach(status => {
        const toBeAdded = document.importNode(infoTemplate, true)
        setHTMLOfChildOfParent(toBeAdded, ".modal__trip-info", status.text)
        statusesTarget.appendChild(toBeAdded)
    })

    warnings.forEach(warning => {
        const toBeAdded = document.importNode(infoTemplate, true)
        setHTMLOfChildOfParent(toBeAdded, ".modal__trip-info", warning.text)
        warningsTarget.appendChild(toBeAdded)
    })

    hints.forEach(hint => {
        const toBeAdded = document.importNode(infoTemplate, true)
        setHTMLOfChildOfParent(toBeAdded, ".modal__trip-info", hint.text)
        hintsTarget.appendChild(toBeAdded)
    })

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
        let xToY: string;
        if (leg.cycle.min === leg.cycle.max) {
            xToY = "" + (leg.cycle.min / 60)
        } else {
            xToY = (leg.cycle.min / 60) + " <span class='de'>bis</span><span class='en'>to</span> " + (leg.cycle.max / 60)
        }
        addInfoToTarget(target, infoTemplate, "<span class='de'>fährt alle</span><span class='en'>every</span> "
            + xToY
            + " <span class='de'>Minuten</span><span class='en'>minutes</span>")
        hasInfo = true
    }
    if (leg.line?.fahrtNr !== undefined) {
        addInfoToTarget(target, infoTemplate, "<span class='de'>Fahrtnummer</span><span class='en'>train number</span>: " + leg.line.fahrtNr)
        hasInfo = true
    }
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

function toggleLegStatuses(index: number) {
    const legContainer = <HTMLElement>document.getElementsByClassName("modal__trip")[index]
    const infosContainer = legContainer.querySelector(".modal__trip-infos-container")!
    if (infosContainer.getAttribute("data-statuses") === "true") {
        infosContainer.setAttribute("data-statuses", "false")
        legContainer.querySelector(".modal__trip-statuses-button-container")!.classList.remove("selectable--horizontal--active")
    } else {
        infosContainer.setAttribute("data-statuses", "true")
        addClassToChildOfParent(legContainer, ".modal__trip-statuses-button-container", "selectable--horizontal--active")
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

export function getWalkHTML(walk: Leg) {
    let walkingTime
    if (walk.departure !== undefined && walk.arrival !== undefined) {
        walkingTime = timeToString(dateDifference(walk.departure!, walk.arrival!));
    }
    if (walk.distance !== undefined && walkingTime !== undefined) {
        return walk.distance + "m <span class='de'>Fußweg (ca.</span><span class='en'>by foot (approx.</span> " + walkingTime + ")"
    } else {
        return "<span class='de'>Fußweg</span><span class='en'>by foot</span>"
    }
}

export function showSubpage(newState: PageStateString, fromNavbar: boolean) {
    if (newState !== "journey" && newState !== "journey/map") {
        pushState(newState)
        return
    }

    if (fromNavbar && journeyBounds[0] === -1) {
        toast("warning", "Wähle zunächst eine Verbindung aus", "Select at least one journey first")
        return
    }

    if (newState === "journey" || screen.width > 1000) {
        displayJourneyModalFirstTime(true);
    }

    pushState(newState, selectedJourney.refreshToken)

    if (newState === "journey/map" || screen.width > 1000) {
        showLeafletModal(true)
    }
}

export function showLeafletModal(lockingNecessary: boolean) {
    if (lockingNecessary && !tryLockingJourneySearch()) {
        toast("warning", "Bitte warten...", "Please wait...")
        return
    }

    document.getElementById("leaflet-modal__title")!.innerText = parseStationStopLocation(selectedJourney.legs[0].origin!).name + " — " + parseStationStopLocation(selectedJourney.legs.at(-1)!.destination!).name

    initMap(selectedJourney, true)

    if (lockingNecessary) {
        unlockJourneySearch()
    }
}
