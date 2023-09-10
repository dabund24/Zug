import {Journey, JourneysOptions} from "hafas-client";
import {slideIndicator} from "./pageActions.js";
import {Accessibility, Language, WalkingSpeed} from "./types";
import {start} from "repl";

let displayedJourneys: Journey[] = [];

export let selectedJourney = -1;

export function saveJourney(journey: Journey) {
    displayedJourneys.push(journey);
}

export function getJourney(i: number) {
    selectedJourney = i;
    return displayedJourneys[i];
}

export function resetJourneys() {
    displayedJourneys.length = 0;
}

export let isArrival = 0;

export function setDepArr(isArr: number) {
    if (isArr === isArrival) {
        return
    }

    slideIndicator("dep-arr-indicator", 2, isArrival, isArr)
    isArrival = isArr
}

export let journeyOptions: JourneysOptions = {
    language: "de",
    transfers: -1,
    transferTime: 0,
    accessibility: "none",
    walkingSpeed: "normal",
    bike: false
}

export function setLanguage(language: Language) {
    const index = (value: Language) => ({
        "de": 0,
        "en": 1
    })[value]
    const start = index(<Language>journeyOptions.language)
    const end = index(language)
    slideIndicator("language-indicator", 2, start, end)
    document.documentElement.setAttribute("lang", language)

    journeyOptions.language = language
}

export function setTransfers(transfers: number) {
    const index = (value: number) => value === -1 ? 7 : value
    const start = index(journeyOptions.transfers!)
    const end = index(transfers)
    slideIndicator("transfers-indicator", 8, start, end)

    journeyOptions.transfers = transfers
}

export function setTransferTime(transferTime: number) {
    const index = (value: number) => ({
        0: 0,
        2: 1,
        5: 2,
        10: 3,
        15: 4,
        20: 5,
        30: 6,
        40: 7
    })[value] || 0
    const start = index(journeyOptions.transferTime!)
    const end = index(transferTime)
    slideIndicator("transfer-time-indicator", 8, start, end)

    journeyOptions.transferTime = transferTime
}



export function setAccessibility(accessibility: Accessibility) {
    const index = (value: Accessibility) => ({
        "none": 0,
        "partial": 1,
        "complete": 2
    })[value]
    const start = index(<Accessibility>journeyOptions.accessibility)
    const end = index(accessibility)
    slideIndicator("accessibility-indicator", 3, start, end)

    journeyOptions.accessibility = accessibility
}

export function setWalkingSpeed(walkingSpeed: WalkingSpeed) {
    const index = (value: WalkingSpeed) => ({
        "slow": 0,
        "normal": 1,
        "fast": 2
    })[value]
    const start = index(<WalkingSpeed>journeyOptions.walkingSpeed)
    const end = index(walkingSpeed)
    slideIndicator("walking-speed-indicator", 3, start, end)

    journeyOptions.walkingSpeed = walkingSpeed
}

export function setBike(bike: boolean) {
    const start = +!!journeyOptions.bike
    const end: number = +bike
    slideIndicator("bike-indicator", 2, start, end)

    journeyOptions.bike = bike
}
