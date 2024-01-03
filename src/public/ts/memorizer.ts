import {Journey, JourneysOptions, Station, Stop, Location, LocationsOptions} from "hafas-client";
import {addSelectableEvents, slideIndicator} from "./pageActions";
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
} from "./types";
import {calculateJourneyBounds} from "./journeyMerge";

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
    isArrival: 0,
    journeysSettings: {
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
    },
    storageSettings: {
        displaySettings: false,
        locationsSettings: false,
        journeysSettings: false
    }
}

export function applyDisplaySettings(newSettings: Settings["displaySettings"]) {
    setTheme(newSettings.theme)
    setColor(newSettings.color)
    setLanguage(newSettings.language)
    setORMLayerAppearance(newSettings.ormLayer)
}

export function applyLocationsSettings(newSettings: LocationsOptions) {
    if (newSettings.language !== undefined)
        setLanguage(<Language> newSettings.language)
    if (!newSettings.poi)
        setSearchType("poi")
    if (!newSettings.addresses)
        setSearchType("addresses")
}

export function applyJourneysSettings(newSettings: JourneysOptions) {
    if (newSettings.language !== undefined)
        setLanguage(<Language> newSettings.language)
    if (newSettings.transfers !== undefined)
        setTransfers(newSettings.transfers)
    if (newSettings.transferTime !== undefined)
        setTransferTime(newSettings.transferTime)
    for (let product in newSettings.products) {
        if (!newSettings.products[product]) {
            setProduct(<Product> product)
        }
    }
    if (newSettings.accessibility !== undefined)
        setAccessibility(<Accessibility> newSettings.accessibility)
    if (newSettings.walkingSpeed !== undefined)
        setWalkingSpeed(<WalkingSpeed> newSettings.walkingSpeed)
    if (newSettings.bike !== undefined)
        setBike(newSettings.bike)
}

function saveSettings(settingType: keyof Settings["storageSettings"]) {
    if (settings.storageSettings[settingType])
        localStorage.setItem(settingType, JSON.stringify(settings[settingType]))
}

function deleteSettings(settingType: keyof Settings["storageSettings"]) {
    localStorage.removeItem(settingType)
}

export function applyInitialSettings() {
    const storedDisplaySettings = localStorage.getItem("displaySettings")
    if (storedDisplaySettings === null) {
        setColor([2, "green"])
        setTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ?
            [1, "dark"] : [0, 'light'])
    } else {
        setStorageSettings("displaySettings", true)
        applyDisplaySettings(JSON.parse(storedDisplaySettings))
    }

    const storedLocationsSettings = localStorage.getItem("locationsSettings")
    if (storedLocationsSettings !== null) {
        setStorageSettings("locationsSettings", true)
        applyLocationsSettings(JSON.parse(storedLocationsSettings))
    }

    const storedJourneysSettings = localStorage.getItem("journeysSettings")
    if (storedJourneysSettings !== null) {
        setStorageSettings("journeysSettings", true)
        applyJourneysSettings(JSON.parse(storedJourneysSettings))
    }

    addSelectableEvents("setting__action--theme", setTheme, [[0, "light"], [1, "dark"]])
    addSelectableEvents("setting__action--color", setColor, [
        [0, 'red'],
        [1, "yellow"],
        [2, "green"],
        [3, "blue"],
        [4, "purple"],
        [5, "gray"]
    ])
    addSelectableEvents("setting__action--orm-layer-appearance", setORMLayerAppearance, [false, true])
    addSelectableEvents("setting__action--language", setLanguage, ["de", "en"])
    addSelectableEvents("setting__action--search-type", setSearchType, ["addresses", "poi"])
    addSelectableEvents("setting__action--products", setProduct, [
        "nationalExpress",
        "national",
        "regionalExpress",
        "regional",
        "suburban",
        "subway",
        "tram",
        "bus",
        "taxi",
        "ferry"
    ])
    addSelectableEvents("setting__action--transfers", setTransfers, [0, 1, 2, 3, 4, 5, 6, -1])
    addSelectableEvents("setting__action--transferTime", setTransferTime, [0, 2, 5, 10, 15, 20, 30, 40])
    addSelectableEvents("setting__action--accessibility", setAccessibility, ["none", "partial", "complete"])
    addSelectableEvents("setting__action--walking-speed", setWalkingSpeed, ["slow", "normal", "fast"])
    addSelectableEvents("setting__action--bike", setBike, [false, true])
    addSelectableEvents("setting__action--storage--display", (value: boolean) => {
        setStorageSettings("displaySettings", value)
    }, [false, true])
    addSelectableEvents("setting__action--storage--locations", (value: boolean) => {
        setStorageSettings("locationsSettings", value)
    }, [false, true])
    addSelectableEvents("setting__action--storage--journeys", (value: boolean) => {
        setStorageSettings("journeysSettings", value)
    }, [false, true])
}

export function setTheme(theme: Theme) {
    if (settings.displaySettings.theme[1] === theme[1]) {
        return
    }
    slideIndicator("theme-indicator", 2, theme[0] === 0 ? 1 : 0, theme[0])

    document.documentElement.setAttribute("data-theme", theme[1]);
    settings.displaySettings.theme = theme
    saveSettings("displaySettings")
}

export function setColor(color: Color) {
    const currentColor = settings.displaySettings.color
    if (color === currentColor) {
        return;
    }

    slideIndicator("color-indicator", 6, currentColor[0], color[0])
    settings.displaySettings.color = color
    document.documentElement.setAttribute("data-color", color[1]);
    saveSettings("displaySettings")
}

export function setLanguage(language: Language) {
    const index = (value: Language) => ({
        "de": 0,
        "en": 1
    })[value]
    const start = index(<Language>settings.journeysSettings.language)
    const end = index(language)
    slideIndicator("language-indicator", 2, start, end)
    document.documentElement.setAttribute("lang", language)

    settings.displaySettings.language = language
    settings.journeysSettings.language = language
    settings.locationsSettings.language = language
    saveSettings("displaySettings")
}

export function setORMLayerAppearance(show: boolean) {
    if (show === settings.displaySettings.ormLayer) {
        return
    }

    slideIndicator("orm-indicator", 2, show ? 0 : 1, show ? 1 : 0)
    document.getElementById("map")!.setAttribute("data-orm", "" + show)
    settings.displaySettings.ormLayer = show
    saveSettings("displaySettings")
}

export function setDepArr(isArr: 0 | 1) {
    if (isArr === settings.isArrival) {
        return
    }

    slideIndicator("dep-arr-indicator", 2, settings.isArrival, isArr)
    settings.isArrival = isArr
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
    saveSettings("locationsSettings")
}

export function setProduct(product: Product) {
    const productButton = document.getElementById("product-indicator__" + product)!
    if (settings.journeysSettings.products![product]) {
        productButton.classList.remove("selectable--horizontal--active")
        settings.journeysSettings.products![product] = false
    } else {
        productButton.classList.add("selectable--horizontal--active")
        settings.journeysSettings.products![product] = true
    }
    saveSettings("journeysSettings")
}

export function setTransfers(transfers: number) {
    const index = (value: number) => value === -1 ? 7 : value
    const start = index(settings.journeysSettings.transfers!)
    const end = index(transfers)
    slideIndicator("transfers-indicator", 8, start, end)

    settings.journeysSettings.transfers = transfers
    saveSettings("journeysSettings")
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
    const start = index(settings.journeysSettings.transferTime!)
    const end = index(transferTime)
    slideIndicator("transfer-time-indicator", 8, start, end)

    settings.journeysSettings.transferTime = transferTime
    saveSettings("journeysSettings")
}



export function setAccessibility(accessibility: Accessibility) {
    const index = (value: Accessibility) => ({
        "none": 0,
        "partial": 1,
        "complete": 2
    })[value]
    const start = index(<Accessibility> settings.journeysSettings.accessibility)
    const end = index(accessibility)
    slideIndicator("accessibility-indicator", 3, start, end)

    settings.journeysSettings.accessibility = accessibility
    saveSettings("journeysSettings")
}

export function setWalkingSpeed(walkingSpeed: WalkingSpeed) {
    const index = (value: WalkingSpeed) => ({
        "slow": 0,
        "normal": 1,
        "fast": 2
    })[value]
    const start = index(<WalkingSpeed> settings.journeysSettings.walkingSpeed)
    const end = index(walkingSpeed)
    slideIndicator("walking-speed-indicator", 3, start, end)

    settings.journeysSettings.walkingSpeed = walkingSpeed
    saveSettings("journeysSettings")
}

export function setBike(bike: boolean) {
    const start = +!!settings.journeysSettings.bike
    const end: number = +bike
    slideIndicator("bike-indicator", 2, start, end)

    settings.journeysSettings.bike = bike
    saveSettings("journeysSettings")
}

export function setStorageSettings(settingType: keyof Settings["storageSettings"], value: boolean) {
    if (value === settings.storageSettings[settingType]) {
        return
    }
    const start = +settings.storageSettings[settingType]
    const end = +value
    settings.storageSettings[settingType] = value
    if (value) {
        saveSettings(settingType)
    } else {
        deleteSettings(settingType)
    }
    slideIndicator(`storage--${settingType}-indicator`, 2, start, end)
}
