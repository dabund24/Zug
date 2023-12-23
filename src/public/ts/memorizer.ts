import {Journey, JourneysOptions, Station, Stop, Location} from "hafas-client";
import {setColor, setTheme, slideIndicator} from "./pageActions.js";
import {Settings, Accessibility, Language, PageState, PageStateString, Product, SearchInputs, WalkingSpeed} from "./types.js";
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

export const searchInputValues: SearchInputs = {
    from: undefined,
    vias: [],
    to: undefined
}

export const displayedStations: SearchInputs = {
    from: undefined,
    vias: [],
    to: undefined
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

export const settings: Settings = {
    displaySettings: {
        theme: [0, "light"],
        color: [2, "green"],
        ormLayer:false
    },
    locationsSettings: {
        language: "de",
        poi: true,
        addresses: true
    },
    journeysSettings: {
        isArrival: 0,
        options: {
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
    }
}

setColor([2, "green"])
setTheme([0, 'light'])

export let isArrival = 0;

export function setDepArr(isArr: number) {
    if (isArr === isArrival) {
        return
    }

    slideIndicator("dep-arr-indicator", 2, isArrival, isArr)
    isArrival = isArr
}

export function setLanguage(language: Language) {
    const index = (value: Language) => ({
        "de": 0,
        "en": 1
    })[value]
    const start = index(<Language>settings.journeysSettings.options.language)
    const end = index(language)
    slideIndicator("language-indicator", 2, start, end)
    document.documentElement.setAttribute("lang", language)

    settings.journeysSettings.options.language = language
    settings.locationsSettings.language = language
}

export function setSearchType(type: "addresses" | "poi") {
    const searchTypeButton = document.getElementById("search-type-indicator__" + type)!
    if (settings.locationsSettings![type]) {
        searchTypeButton.classList.remove("selectable--horizontal--active")
        settings.locationsSettings[type] = false
    } else {
        searchTypeButton.classList.add("selectable--horizontal--active")
        settings.locationsSettings[type] = true
    }
}

export function setProduct(product: Product) {
    const productButton = document.getElementById("product-indicator__" + product)!
    if (settings.journeysSettings.options.products![product]) {
        productButton.classList.remove("selectable--horizontal--active")
        settings.journeysSettings.options.products![product] = false
    } else {
        productButton.classList.add("selectable--horizontal--active")
        settings.journeysSettings.options.products![product] = true
    }
}

export function setTransfers(transfers: number) {
    const index = (value: number) => value === -1 ? 7 : value
    const start = index(settings.journeysSettings.options.transfers!)
    const end = index(transfers)
    slideIndicator("transfers-indicator", 8, start, end)

    settings.journeysSettings.options.transfers = transfers
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
    const start = index(settings.journeysSettings.options.transferTime!)
    const end = index(transferTime)
    slideIndicator("transfer-time-indicator", 8, start, end)

    settings.journeysSettings.options.transferTime = transferTime
}



export function setAccessibility(accessibility: Accessibility) {
    const index = (value: Accessibility) => ({
        "none": 0,
        "partial": 1,
        "complete": 2
    })[value]
    const start = index(<Accessibility> settings.journeysSettings.options.accessibility)
    const end = index(accessibility)
    slideIndicator("accessibility-indicator", 3, start, end)

    settings.journeysSettings.options.accessibility = accessibility
}

export function setWalkingSpeed(walkingSpeed: WalkingSpeed) {
    const index = (value: WalkingSpeed) => ({
        "slow": 0,
        "normal": 1,
        "fast": 2
    })[value]
    const start = index(<WalkingSpeed> settings.journeysSettings.options.walkingSpeed)
    const end = index(walkingSpeed)
    slideIndicator("walking-speed-indicator", 3, start, end)

    settings.journeysSettings.options.walkingSpeed = walkingSpeed
}

export function setBike(bike: boolean) {
    const start = +!!settings.journeysSettings.options.bike
    const end: number = +bike
    slideIndicator("bike-indicator", 2, start, end)

    settings.journeysSettings.options.bike = bike
}
