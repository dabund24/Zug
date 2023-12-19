import {Journey, JourneysOptions} from "hafas-client";
import {slideIndicator} from "./pageActions.js";
import {Accessibility, Language, PageState, PageStateString, Product, WalkingSpeed} from "./types.js";
import {calculateJourneyBounds} from "./journeyMerge.js";

let allowJourneySearch = true

export function tryLockingJourneySearch() {
    if (allowJourneySearch) {
        allowJourneySearch = false
        return true
    }
    return false
}

export function unlockJourneySearch() {
    allowJourneySearch = true
}

let displayedJourneys: Journey[][] = []

export let selectedJourneys: number[] = []

export let selectedJourney: Journey

export let journeyBounds: [number, number] = [-1, -1]

export function setJourneyBounds(bounds: [number, number]) {
    journeyBounds = bounds
}

export function saveJourney(depth: number, journey: Journey) {
    displayedJourneys[depth].push(journey);
}

export function getJourney(depth: number, idInDepth: number) {
    /*selectedJourneys = [depth, idInDepth];*/
    return displayedJourneys[depth][idInDepth];
}

export function setJourney(depth: number, idInDepth: number, journey: Journey) {
    displayedJourneys[depth][idInDepth] = journey
}

export function resetJourneys(newLegCount: number) {
    selectedJourneys = Array.from(Array(newLegCount), () => -1)
    displayedJourneys = Array.from(Array(newLegCount), () => [])
    calculateJourneyBounds()
}

export function setSelectedJourney(journey: Journey) {
    selectedJourney = journey
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
    results: 10,
    transfers: -1,
    transferTime: 0,
    products: {
        nationalExpress: true,
        national: true,
        regionalExpress: true,
        regional: true,
        suburban: true,
        subway: true,
        tram: true,
        bus: true,
        ferry: true,
        taxi: true
    },
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

export function setProduct(product: Product) {
    console.log(product)
    const productButton = document.getElementById("product-indicator__" + product)!
    if (journeyOptions.products![product]) {
        productButton.classList.remove("selectable--horizontal--active")
        journeyOptions.products![product] = false
    } else {
        productButton.classList.add("selectable--horizontal--active")
        journeyOptions.products![product] = true
    }
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
