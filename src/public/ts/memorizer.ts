import {Journey} from "hafas-client";

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