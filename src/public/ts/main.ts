import {Journey, JourneyWithRealtimeData, RefreshJourneyOptions, Station, Stop, Location} from "hafas-client";
import {
    addStationNames,
    displayJourneyModal,
    displayJourneyModalFirstTime,
    displayJourneyTree,
} from "./display.js";
import {hideLoadSlider, setColor, setTheme, showLoadSlider, toast} from "./pageActions.js";
import {
    getJourney,
    isArrival, journeyBounds,
    journeyOptions, saveJourney, searchInputValues, selectedJourney, selectedJourneys,
    setJourney,
    tryLockingJourneySearch,
    unlockJourneySearch
} from "./memorizer.js";
import {PageState, PageStateString, ZugErrorType, ZugResponse} from "./types.js";
import {setupSearch} from "./search.js";
import {initMap} from "./map.js";
import {mergeSelectedJourneys} from "./journeyMerge.js";

setColor([2, "green"])
setTheme([0, 'light'])
setupSearch()

export async function findConnections() {
    if (!tryLockingJourneySearch()) {
        toast("warning", "Mensch bist du ungeduldig :)", "Please wait")
        return
    }
    showLoadSlider();
    toast("neutral", "Suche Verbindungen", "Finding connections")
    document.getElementById("connections-root-container")!.replaceChildren()

    const vias = searchInputValues.vias
        .filter(station => station !== undefined)

    if (searchInputValues.from === undefined || searchInputValues.to === undefined) {
        toast("error", "Start und Ziel müssen angegeben werden", "Specifying start and destination is mandatory")
        unlockJourneySearch()
        hideLoadSlider()
        return
    }

    const from = searchInputValues.from
    const to = searchInputValues.to

    const stationNames = [<string> from.name, vias.map(station => <string> station!.name), <string> to.name].flat()
    addStationNames(stationNames)

    const isArrQuery = "&isArrival=" + isArrival
    let timeQuery = "";
    if ((<HTMLInputElement>document.getElementById("time__input")).value !== "") {
        timeQuery = "&time=" + (<HTMLInputElement>document.getElementById("time__input")).value
    }
    let viasQuery = "&vias=" + JSON.stringify(vias)
    let journeyOptionsQuery = "&options=" + JSON.stringify(journeyOptions)

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
            stationA = stationNames[treeResponse.content.stationA]
        }
        if (treeResponse.content.stationB === -1) {
            stationB = "";
        } else {
            stationB = stationNames[treeResponse.content.stationB]
        }

        printErrorMessage(treeResponse.content.errorType, stationA, stationB)
        hideLoadSlider()
        unlockJourneySearch()
        return
    }

    const journeyTree = treeResponse.content

    console.log(journeyTree)

    const connectionCount = displayJourneyTree(journeyTree, stationNames)
    toast("success", connectionCount + " Verbindungen gefunden", "Found " + connectionCount + " connections")
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
        const journeyPromise = fetch("/api/refresh?token=" + token + "&lang=" + journeyOptions.language)
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