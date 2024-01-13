import {Journey, JourneyWithRealtimeData} from "hafas-client";
import {
    addStationNames,
    displayJourneyModal,
    displayJourneyTree,
} from "./display";
import {
    applyInitialSettings,
    displayedDiagramData,
    getJourney,
    journeyBounds,
    saveJourney, searchInputValues, selectedJourney, selectedJourneys,
    setJourney, settings,
    tryLockingJourneySearch,
    unlockJourneySearch
} from "./memorizer";
import {hideLoadSlider, showLoadSlider, toast, sharePage} from "./pageActions";
import {DisplayedDiagramData, SearchObject, ZugErrorDescription, ZugErrorType, ZugResponse} from "./types";
import {setupSearch} from "./search";
import {initMap} from "./map";
import {mergeSelectedJourneys} from "./journeyMerge";
import {replaceDiagramURL, routeToInitialState} from "./routing";
import {prepareDiagramActions} from "./diagramActions";

applyInitialSettings()
routeToInitialState()
setupSearch()
prepareDiagramActions()

const shareButtons = document.getElementsByClassName("share-button")
for (let i = 0; i < shareButtons.length; i++) {
    shareButtons[i].addEventListener("click", () => sharePage("journey"))
}

const refreshButtons = document.getElementsByClassName("refresh-button")
for (let i = 0; i < refreshButtons.length; i++) {
    refreshButtons[i].addEventListener("click", () => refreshJourney(undefined))
}

const refreshMapButtons = document.getElementsByClassName("refresh-map-button")
for (let i = 0; i < refreshMapButtons.length; i++) {
    refreshMapButtons[i].addEventListener("click", () => refreshJourneyAndInitMap(undefined))
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js")
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        document.documentElement.classList.remove("preload")
    }, 500)
})

/**
 * If passed data is valid, updates page url, fetches journey tree based on the passed data and invokes diagram generation.
 * @param diagramData what the user wants to be generated
 */
export async function findConnections(diagramData: DisplayedDiagramData) {
    if (!tryLockingJourneySearch()) {
        toast("warning", "Mensch bist du ungeduldig :)", "Please wait")
        return
    }
    showLoadSlider();

    // check for obvious/common mistakes in request
    const from = diagramData.stations.from
    const to = diagramData.stations.to
    if (from === undefined || to === undefined) {
        toast("error", "Start und Ziel müssen angegeben werden", "Specifying start and destination is mandatory")
        unlockJourneySearch()
        hideLoadSlider()
        return
    }
    const vias = diagramData.stations.vias
        .filter((station): station is SearchObject => station !== undefined)
    const stations = [from, vias, to].flat()
    const invalidStation = checkStationsValidity(stations)
    if (invalidStation !== null) {
        toast("error", `${invalidStation.name} kann nicht Start und Ziel gleichzeiting sein`, `${invalidStation.name} cannot be both start and destination`)
        unlockJourneySearch()
        hideLoadSlider()
        return
    }

    // update displayedDiagramData object
    displayedDiagramData.stations = {
        from: from,
        vias: vias.slice(0),
        to: to
    }
    displayedDiagramData.time = diagramData.time
    displayedDiagramData.isArrival = diagramData.isArrival
    displayedDiagramData.options = diagramData.options

    replaceDiagramURL()

    addStationNames(stations)
    document.getElementById("connections-root-container")!.replaceChildren()
    document.documentElement.setAttribute("data-vias", (vias.length).toString())

    // fetch journey tree
    const apiURL = new URL("/api/journeys", window.location.origin)
    apiURL.searchParams.set("from", from.requestParameter)
    apiURL.searchParams.set("vias", JSON.stringify(vias.map(via => via.requestParameter)))
    apiURL.searchParams.set("to", to.requestParameter)
    apiURL.searchParams.set("isArr", diagramData.isArrival.toString())
    apiURL.searchParams.set("time", diagramData.time)
    apiURL.searchParams.set("options", JSON.stringify(diagramData.options))
    toast("neutral", "Suche Verbindungen", "Finding connections")
    let treeResponse: ZugResponse
    try {
        treeResponse = await fetch(apiURL).then(res => res.json());
    } catch (err) {
        toast("error", "Netzwerk-Fehler", "Network error")
        hideLoadSlider()
        unlockJourneySearch()
        return
    }

    if (treeResponse.isError) {
        handleRequestError(treeResponse.content, stations.map(station => station.name))
        return
    }

    const journeyTree = treeResponse.content

    const connectionCount = displayJourneyTree(journeyTree, stations.length)
    toast("success", connectionCount + " Verbindungen gefunden", "Found " + connectionCount + " connections")
    hideLoadSlider()
    unlockJourneySearch()
}

function checkStationsValidity(stations: SearchObject[]) {
    for (let i = 1; i < stations.length; i++) {
        if (stations[i - 1].requestParameter === stations[i].requestParameter) {
            return stations[i]
        }
    }
    return null
}

function handleRequestError(errorContent: ZugErrorDescription, stationNames: string[]) {
    let stationA: string
    let stationB: string
    if (errorContent.stationA === -1) {
        stationA = "";
    } else {
        stationA = stationNames[errorContent.stationA]
    }
    if (errorContent.stationB === -1) {
        stationB = "";
    } else {
        stationB = stationNames[errorContent.stationB]
    }

    printErrorMessage(errorContent.errorType, stationA, stationB)
    hideLoadSlider()
    unlockJourneySearch()
}

export async function refreshJourneyAndInitMap(tokenString: string | undefined) {
    await refreshJourney(tokenString)
    initMap(selectedJourney, false)
}

export async function refreshJourney(tokenString: string | undefined) {
    if (!tryLockingJourneySearch()) {
        toast("warning", "Bitte warten...", "Please wait...")
        return
    }
    showLoadSlider()
    tokenString = selectedJourney.refreshToken
    if (tokenString === undefined) {
        toast("error", "Aktualisierung gescheitert (fehlendes Token)", "refresh failed (missing token)")
        hideLoadSlider()
        unlockJourneySearch()
        return
    }
    const tokens: string[] = JSON.parse(tokenString)
    const journeyPromises: Promise<Journey | null>[] = []
    // fetch journeys for all tokens
    tokens.forEach(token => {
        const journeyPromise = fetch("/api/refresh?token=" + token + "&lang=" + settings.journeysSettings.language)
            .then(res => res.json())
            .then((refreshedResponse: [JourneyWithRealtimeData] | [null]) => {
                const refreshed = refreshedResponse[0]
                if (refreshed === null) {
                    toast("error", "Aktualisierung gescheitert (Hafas)", "refresh failed (Hafas)")
                    hideLoadSlider()
                    return null
                }
                return refreshed.journey
            }).catch(() => {
                toast("error", "Netzwerkfehler", "network error")
                return null
            })
        journeyPromises.push(journeyPromise)
    })

    // await promises
    const journeys = await Promise.all(journeyPromises)

    // write journeys
    for (let i = 0; i < journeys.length; i++) {
        const journey = journeys[i]
        if (journey !== null) {
            setJourney(journeyBounds[0] + i, selectedJourneys[journeyBounds[0] + i], journey)
        } else {
            toast("warning",
                "Teilabschnitt " + (i + 1) + " konnte nicht aktualisiert werden.",
                "Journey leg " + (i + 1) + "  could not be refreshed.")
        }
    }

    mergeSelectedJourneys()
    displayJourneyModal(selectedJourney)
    toast("success", "Verbindungsdaten aktualisiert", "refreshed connection data")


    hideLoadSlider()
    unlockJourneySearch()
}

function printErrorMessage(errorType: ZugErrorType, stationA: string, stationB: string) {
    switch (errorType) {
        case "noConnections":
        case "hafasNotFound":
            toast("error",
                "Keine Verbindungen von " + stationA + " nach " + stationB + " gefunden",
                "Found no connections from " + stationA + " to " + stationB)
            break
        case "networkError":
            toast("error",
                "Hafas-Server nicht erreichbar",
                "Hafas server not responding")
            break
        default:
            toast("error",
                "Ein Fehler ist aufgetreten: " + errorType,
                "An error occurred: " + errorType)
    }
}