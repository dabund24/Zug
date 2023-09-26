import {JourneyWithRealtimeData, RefreshJourneyOptions, Station, Stop} from "hafas-client";
import {displayJourneyModal, displayJourneyTree} from "./display.js";
import {hideLoadSlider, setColor, setTheme, showLoadSlider, toast} from "./pageActions.js";
import {isArrival, journeyOptions, setJourney, tryLockingJourneySearch, unlockJourneySearch} from "./memorizer.js";
import {TreeMatrixPair, ZugErrorType, ZugResponse} from "./types.js";
import {setupSearch} from "./search.js";

setColor([2, "green"])
setTheme([1, 'dark'])
setupSearch()

export async function findConnections() {
    if (!tryLockingJourneySearch()) {
        toast("warning", "Mensch bist du ungeduldig :)", "Please wait")
        return
    }
    showLoadSlider();
    toast("neutral", "Suche Verbindungen", "Finding connections")
    const fromStr = (<HTMLInputElement>document.getElementById("from__input")).value
    const vias: string[] = []
    const viaNames: string[] = []
    for (let i = 0; i < 3; i++) {
        const viaStr = (<HTMLInputElement>document.getElementById("via" + (i + 1) + "__input")).value
        if (viaStr === "") {
            continue
        }

        let via: (Station | Stop)[]
        try {
            via = await fetch("/api/stations?name=" + viaStr).then(res => res.json())
            if (via.length === 0) {
                toast("error", "Die Station \"" + viaStr + "\" gibt es nicht", "The station \"" + viaStr + "\" does not exist")
                hideLoadSlider();
                unlockJourneySearch()
                return
            }
        } catch (err) {
            toast("error", "Die Station \"" + viaStr + "\" gibt es nicht", "The station \"" + viaStr + "\" does not exist")
            hideLoadSlider();
            unlockJourneySearch()
            return
        }
        const viaID = via[0].id
        if (viaStr !== "" && viaID !== undefined) {
            vias.push(viaID)
            viaNames.push(via[0].name!)
        }
    }
    //const viaStr = (<HTMLInputElement>document.getElementById("via1__input")).value
    const toStr = (<HTMLInputElement>document.getElementById("to__input")).value

    const from: (Station | Stop)[] = await fetch("/api/stations?name=" + fromStr).then(res => res.json()).catch(() => {
        toast("error", "Verbindung zu Server fehlgeschlagen", "Network error")
        return []
    })
    if (from.length === 0) {
        hideLoadSlider()
        unlockJourneySearch()
        return
    }
    const to: (Station | Stop)[] = await fetch("/api/stations?name=" + toStr).then(res => res.json())

    const fromID = from[0].id
    //let viaID = via[0].id
    const toID = to[0].id

    if (fromID === undefined || toID === undefined) {
        unlockJourneySearch()
        return;
    }

    const isArrQuery = "&isArrival=" + isArrival
    let timeQuery = "";
    if ((<HTMLInputElement>document.getElementById("time__input")).value !== "") {
        timeQuery = "&time=" + (<HTMLInputElement>document.getElementById("time__input")).value
    }
    let viasQuery = "&vias=" + JSON.stringify(vias)
    let journeyOptionsQuery = "&options=" + JSON.stringify(journeyOptions)

    let treeResponse: ZugResponse
    try {
        treeResponse = await fetch("/api/journeys?from=" + fromID + viasQuery + "&to=" + toID + timeQuery + isArrQuery + journeyOptionsQuery).then(res => res.json());
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
        } else if (treeResponse.content.stationA === 0) {
            stationA = <string> from[0].name
        } else {
            stationA = viaNames[treeResponse.content.stationA - 1]
        }
        if (treeResponse.content.stationB === -1) {
            stationB = "";
        } else if (treeResponse.content.stationB === viaNames.length + 1) {
            stationB = <string> to[0].name
        } else {
            stationB = viaNames[treeResponse.content.stationB - 1]
        }
        printErrorMessage(treeResponse.content.errorType, stationA, stationB)
        hideLoadSlider()
        unlockJourneySearch()
        return
    }

    //updatePageHistory(fromID, vias, toID)
    const journeyTree = treeResponse.content

    console.log(journeyTree)

    const connectionCount = displayJourneyTree(journeyTree, [<string> from[0].name, viaNames, <string> to[0].name].flat())
    document.documentElement.setAttribute("data-vias", (vias.length).toString())
    toast("success", connectionCount + " Verbindungen gefunden", "Found " + connectionCount + " connections")
    hideLoadSlider()
    unlockJourneySearch()
}

export async function refreshJourney(token: string | undefined, index: number) {
    if (!tryLockingJourneySearch()) {
        toast("warning", "Bitte warten...", "Please wait...")
        return
    }
    showLoadSlider()
    if (token === undefined) {
        toast("error", "Aktualisierung gescheitert (fehlendes Token)", "refresh failed (missing token)")
        hideLoadSlider()
        unlockJourneySearch()
        return
    }
    await fetch("/api/refresh?token=" + token + "&lang=" + journeyOptions.language).then(res => res.json()).then((refreshed: JourneyWithRealtimeData | null) => {
        if (refreshed === null) {
            toast("error", "Aktualisierung gescheitert (Hafas)", "refresh failed (Hafas)")
            hideLoadSlider()
            return
        }
        setJourney(index, refreshed.journey)
        displayJourneyModal(refreshed.journey)
        toast("success", "Verbindungsdaten aktualisiert", "refreshed connection data")
    }).catch(() => {
        toast("error", "Netzwerkfehler", "network error")
    })
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

function updatePageHistory(from: string, vias: string[], to: string) {
    const url = new URL(window.location.href)
    url.searchParams.set("from", from)
    url.searchParams.set("vias", JSON.stringify(vias))
    url.searchParams.set("to", to)
    history.pushState({}, from, url)
    console.log("hallo")
}

