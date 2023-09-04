import {Journey} from "hafas-client";
import {slideIndicator} from "./pageActions.js";

let displayedJourneys: Journey[] = [];

export function saveJourney(journey: Journey) {
    displayedJourneys.push(journey);
}

export function getJourney(i: number) {
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

