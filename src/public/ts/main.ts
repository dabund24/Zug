import {Journey, JourneyWithRealtimeData, RefreshJourneyOptions, Station, Stop, Location} from "hafas-client";
import {
    addStationNames,
    displayJourneyModal,
    displayJourneyModalFirstTime,
    displayJourneyTree,
} from "./display";
import {
    applyInitialSettings,
    displayedStations,
    getJourney,
    journeyBounds,
    saveJourney, searchInputValues, selectedJourney, selectedJourneys,
    setJourney, settings,
    tryLockingJourneySearch,
    unlockJourneySearch
} from "./memorizer";
import {hideLoadSlider, showLoadSlider, toast} from "./pageActions";
import {PageState, PageStateString, SearchObject, ZugErrorType, ZugResponse} from "./types";
import {setupSearch} from "./search";
import {initMap} from "./map";
import {mergeSelectedJourneys} from "./journeyMerge";
import {routeToInitialState} from "./routing";
import {prepareDiagramActions} from "./diagramActions";

applyInitialSettings()
routeToInitialState()
setupSearch()
prepareDiagramActions()

const shareButtons = document.getElementsByClassName("share-button")
for (let i = 0; i < shareButtons.length; i++) {
    shareButtons[i].addEventListener("click", () => shareJourney())
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
        document.documentElement.className = ""
    }, 500)
})

export async function findConnections(fromInput: boolean) {
    if (!tryLockingJourneySearch()) {
        toast("warning", "Mensch bist du ungeduldig :)", "Please wait")
        return
    }
    showLoadSlider();

    const requestValues = fromInput ? searchInputValues : displayedStations

    const vias = requestValues.vias
        .filter((station): station is SearchObject => station !== undefined)

    if (requestValues.from === undefined || requestValues.to === undefined) {
        toast("error", "Start und Ziel müssen angegeben werden", "Specifying start and destination is mandatory")
        unlockJourneySearch()
        hideLoadSlider()
        return
    }

    const from = requestValues.from
    const to = requestValues.to

    const stations = [from, vias, to].flat()
    const invalidStation = checkStationsValidity(stations)
    if (invalidStation !== null) {
        toast("error", `${invalidStation.name} kann nicht Start und Ziel gleichzeiting sein`, `${invalidStation.name} cannot be both start and destination`)
        unlockJourneySearch()
        hideLoadSlider()
        return
    }
    toast("neutral", "Suche Verbindungen", "Finding connections")
    addStationNames(stations)
    document.getElementById("connections-root-container")!.replaceChildren()

    const isArrQuery = "&isArrival=" + settings.isArrival
    let timeQuery = "";
    if ((<HTMLInputElement>document.getElementById("time__input")).value !== "") {
        timeQuery = "&time=" + (<HTMLInputElement>document.getElementById("time__input")).value
    }
    let viasQuery = "&vias=" + JSON.stringify(vias.map(via => via?.requestParameter))
    let journeyOptionsQuery = "&options=" + JSON.stringify(settings.journeysSettings)

    let treeResponse: ZugResponse
    try {
        treeResponse = await fetch("/api/journeys?from=" + from.requestParameter + viasQuery + "&to=" + to.requestParameter + timeQuery + isArrQuery + journeyOptionsQuery).then(res => res.json());
    } catch (err) {
        toast("error", "Netzwerk-Fehler", "Network error")
        hideLoadSlider()
        unlockJourneySearch()
        return
    }

    if (treeResponse.isError) {
        let stationA: string
        let stationB: string
        if (treeResponse.content.stationA === -1) {
            stationA = "";
        } else {
            stationA = stations[treeResponse.content.stationA]!.name
        }
        if (treeResponse.content.stationB === -1) {
            stationB = "";
        } else {
            stationB = stations[treeResponse.content.stationB]!.name
        }

        printErrorMessage(treeResponse.content.errorType, stationA, stationB)
        hideLoadSlider()
        unlockJourneySearch()
        return
    }

    const journeyTree = treeResponse.content

    displayedStations.from = from
    displayedStations.vias = vias.slice(0)
    displayedStations.to = to

    console.log(journeyTree)

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
    const journeys: Array<Journey | null> = []
    for (const journeyPromise of journeyPromises) {
        journeys.push(await journeyPromise)
    }
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

export function shareJourney() {
    let sharedText: string
    if (journeyBounds === undefined) {
        sharedText = new URL(window.location.href).toString()
    } else {
        mergeSelectedJourneys()
        sharedText = new URL("/journey?journey=" + btoa(<string>selectedJourney.refreshToken), window.location.href).toString()
    }

    if (navigator.share) {
        navigator.share({
            title: `Reise von ${selectedJourney.legs[0].origin?.name} nach ${selectedJourney.legs.at(-1)?.origin?.name}`,
            url: sharedText
        }).then(() => {
            toast("success", "Verbindung geteilt", "Shared connection")
        })
    } else {
        navigator.clipboard.writeText(sharedText).then(() => {
            toast("success", "Link in Zwischenablage gespeichert", "Saved link to clipboard")
        })
    }
}