import {Journey, JourneysOptions, Station, Stop, Location, LocationsOptions} from "hafas-client";
import {slideIndicator} from "./pageActions.js";
import {
    Settings,
    Accessibility,
    Language,
    PageState,
    PageStateString,
    Product,
    SearchInputs,
    WalkingSpeed,
    Theme, Color
} from "./types.js";
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
        ormLayer: false,
        language: "de"
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

export function applyDisplaySettings(newSettings: Settings["displaySettings"]) {
    setTheme(newSettings.theme)
    setColor(newSettings.color)
    setLanguage(newSettings.language)
    setORMLayerAppearance(newSettings.ormLayer)
}

export function applyLocationsSettings(newSettings: LocationsOptions) {
    setLanguage(<Language> newSettings.language)
    if (!newSettings.poi) {
        setSearchType("poi")
    }
    if (!newSettings.addresses) {
        setSearchType("addresses")
    }
}

export function applyJourneysSettings(newSettings: JourneysOptions) {
    setLanguage(<Language> newSettings.language)
    setTransfers(newSettings.transfers!)
    setTransferTime(newSettings.transferTime!)
    for (let product in newSettings.products) {
        if (!newSettings.products[product]) {
            setProduct(<Product> product)
        }
    }
    setAccessibility(<Accessibility> newSettings.accessibility)
    setWalkingSpeed(<WalkingSpeed> newSettings.walkingSpeed)
    setBike(newSettings.bike!)
}

function saveDisplaySettings() {
    localStorage.setItem("display", JSON.stringify(settings.displaySettings))
}

const storedDisplaySettings = localStorage.getItem("display")
if (storedDisplaySettings === null) {
    setColor([2, "green"])
    setTheme([0, 'light'])
} else {
    applyDisplaySettings(JSON.parse(storedDisplaySettings))
}

export function setTheme(theme: Theme) {
    if (settings.displaySettings.theme[1] === theme[1]) {
        return
    }
    slideIndicator("theme-indicator", 2, theme[0] === 0 ? 1 : 0, theme[0])

    document.documentElement.setAttribute("data-theme", theme[1]);
    settings.displaySettings.theme = theme
    saveDisplaySettings()
}

export function setColor(color: Color) {
    const currentColor = settings.displaySettings.color
    if (color === currentColor) {
        return;
    }

    slideIndicator("color-indicator", 6, currentColor[0], color[0])
    settings.displaySettings.color = color
    document.documentElement.setAttribute("data-color", color[1]);
    saveDisplaySettings()
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

    settings.displaySettings.language = language
    settings.journeysSettings.options.language = language
    settings.locationsSettings.language = language
    saveDisplaySettings()
}

export function setORMLayerAppearance(show: boolean) {
    if (show === settings.displaySettings.ormLayer) {
        return
    }

    slideIndicator("orm-indicator", 2, show ? 0 : 1, show ? 1 : 0)
    document.getElementById("map")!.setAttribute("data-orm", "" + show)
    settings.displaySettings.ormLayer = show
    saveDisplaySettings()
}

export function setDepArr(isArr: 0 | 1) {
    if (isArr === settings.journeysSettings.isArrival) {
        return
    }

    slideIndicator("dep-arr-indicator", 2, settings.journeysSettings.isArrival, isArr)
    settings.journeysSettings.isArrival = isArr
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
