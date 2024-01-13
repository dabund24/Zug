import {DisplayedDiagramData, JourneyNode, JourneyTree, PageState, PageStateString, SearchObject} from "./types";
import {
    addStationNames,
    displayJourneyTree,
    showSubpage
} from "./display";
import {
    displayedDiagramData,
    resetJourneys, selectedJourney,
    selectedJourneys,
    setJourney, settings,
    tryLockingJourneySearch,
    unlockJourneySearch
} from "./memorizer";
import {addSelectableEvents, hideLoadSlider, showLoadSlider, slideIndicator, toast} from "./pageActions";
import {Journey, JourneyWithRealtimeData} from "hafas-client";
import {calculateJourneyBounds, mergeSelectedJourneys, selectJourney} from "./journeyMerge";
import {parseStationStopLocation} from "./search";
import {findConnections} from "./main";


export function routeToInitialState() {
    addSelectableEvents("footer__buttons", (value: PageStateString) => {
        showSubpage(value, true)
    }, ["", "journey", "journey/map", "journey", "settings", "about"])
    const url = new URL(window.location.href)
    const path = <PageStateString>window.location.pathname.substring(1)
    const journeyQuery = new URLSearchParams(window.location.search).get("journey")

    window.history.replaceState(<PageState>{state: ""}, "", "/")
    switch (path) {
        case "":
            parseDiagramURL(url)
            window.history.replaceState(<PageState>{state: ""}, "", url)
            break
        case "settings":
        case "about":
            showSubpage(path, false)
            break
        case "journey":
            if (journeyQuery !== null) {
                displaySharedJourney(journeyQuery, false)
            }
            break
        case "journey/map":
            if (journeyQuery !== null) {
                displaySharedJourney(journeyQuery, true)
            }
    }

    window.onpopstate = () => {
        const oldState = <PageStateString>document.documentElement.getAttribute("data-state")
        const newState = (<PageState>history.state).state
        if (newState === oldState) {
            return
        }
        document.documentElement.setAttribute("data-state", newState)
        const [desktopStart, mobileStart] = pageStateStringToID(oldState)
        const [desktopEnd, mobileEnd] = pageStateStringToID(newState)
        slideIndicator("subpage-indicator--desktop", 4, desktopStart, desktopEnd)
        slideIndicator("subpage-indicator--mobile", 5, mobileStart, mobileEnd)
        if ((newState == "journey" || newState == "journey/map") && (<PageState>history.state).journeyID !== selectedJourney?.refreshToken) {
            toast("neutral", "Lade die Seite neu, um die korrekte Verbindung anzeigen zu lassen", "Reload the page to show the correct journey")
        }
    }

    window.addEventListener("keydown", event => {
        if (event.key === "Escape" && (<PageState>history.state).state !== "") {
            history.back()
        }
    })
}

export function pushState(newState: PageStateString, refreshToken?: string) {
    const oldState = <PageStateString>document.documentElement.getAttribute("data-state")
    if (newState === oldState) {
        return
    }
    const baseURL = new URL(window.location.href).origin
    if (refreshToken !== undefined) {
        const refreshTokenEncoded = btoa(refreshToken)
        const url = new URL(`${newState}?journey=${refreshTokenEncoded}`, baseURL)
        window.history.pushState(<PageState>{state: newState, journeyID: refreshToken}, "", url)
    } else if (newState === "" && displayedDiagramData.time !== "") {
        const url = getDisplayedDiagramURL(baseURL)
        window.history.pushState(<PageState>{state: newState}, "", url)
    } else {
        const url = new URL(newState, baseURL)
        window.history.pushState(<PageState>{state: newState}, "", url)
    }
    document.documentElement.setAttribute("data-state", newState)
    const [desktopStart, mobileStart] = pageStateStringToID(oldState)
    const [desktopEnd, mobileEnd] = pageStateStringToID(newState)
    slideIndicator("subpage-indicator--desktop", 4, desktopStart, desktopEnd)
    slideIndicator("subpage-indicator--mobile", 5, mobileStart, mobileEnd)
}

export function replaceDiagramURL() {
    const baseURL = new URL(window.location.href).origin
    const url = getDisplayedDiagramURL(baseURL)
    window.history.replaceState(<PageState>{state: ""}, "", url)
}

function getDisplayedDiagramURL(baseURL: string) {
    const url = new URL(baseURL)
    const sharedData = displayedDiagramData
    if (
        sharedData.stations === undefined
        || sharedData.time === undefined
        || sharedData.options === undefined
        || sharedData.isArrival === undefined
    ) {
        return url
    }
    url.searchParams.set("diagram", btoa(JSON.stringify(displayedDiagramData)))
    return url
}

function parseDiagramURL(url: URL) {
    const diagramParam = url.searchParams.get("diagram")
    if (diagramParam === null) {
        return
    }
    try {
        const sharedData = <DisplayedDiagramData> JSON.parse(atob(diagramParam))
        findConnections(sharedData)
    } catch (e) {
        console.log(e)
        toast("error", "Link ist fehlerhaft", "link is broken")
    }
}

export async function displaySharedJourney(tokenString: string, withMap: boolean) {
    if (!tryLockingJourneySearch()) {
        return
    }
    showLoadSlider()
    toast("neutral", "Hole Verbindungsdaten", "Fetching connection data")

    try {
        tokenString = atob(tokenString)
    } catch (e) {
        hideLoadSlider()
        unlockJourneySearch()
        toast("error", "Ungültiges Token", "invalid token")
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
                    toast("error", "Ungültiges Token", "invalid token")
                    hideLoadSlider()
                    unlockJourneySearch()
                    return null
                }
                return refreshed.journey;
            }).catch((e) => {
                console.log(e)
                toast("error", "Netzwerkfehler", "network error")
                return null
            })
        journeyPromises.push(journeyPromise)
    })

    // await promises
    const journeys = await Promise.all(journeyPromises)

    // write journeys
    const stations: SearchObject[] = []
    resetJourneys(journeys.length)
    for (let i = 0; i < journeys.length; i++) {
        const journey = journeys[i]
        if (journey !== null) {
            setJourney(i, selectedJourneys[i], journey)
            stations.push(parseStationStopLocation(journey.legs[0].origin!))
            if (i === journeys.length - 1) {
                stations.push(parseStationStopLocation(journey.legs.at(-1)?.destination!))
            }
        } else {
            hideLoadSlider()
            unlockJourneySearch()
            return
        }
    }

    addStationNames(stations)
    displayedDiagramData.stations = {
        from: stations[0],
        vias: stations.slice(1, -1),
        to: stations.at(-1)!
    }
    displayJourneyTree(getSimpleJourneyTree(<Journey[]>journeys), stations.length)
    for (let i = 0; i < journeys.length; i++) {
        selectJourney(i, 0)
    }
    calculateJourneyBounds()
    mergeSelectedJourneys()

    toast("success", "Verbindung gefunden", "found connection")

    hideLoadSlider()
    unlockJourneySearch()

    showSubpage(withMap ? "journey/map" : "journey", false)
}

function getSimpleJourneyTree(journeys: Journey[]): JourneyTree {
    return  {
        children: getSimpleJourneyNode(journeys, 0)!
    }
}

function getSimpleJourneyNode(journeys: Journey[], depth: number): JourneyNode[] | null {
    if (journeys.length === 0) {
        return null
    }
    return [{
        depth: depth,
        idInDepth: 0,
        journey: journeys[0],
        children: getSimpleJourneyNode(journeys.slice(1), depth + 1)
    }]
}

/**
 * get ID of subpage
 * @param pageStateString
 * @returns [desktop id, mobile id]
 */
export function pageStateStringToID(pageStateString: PageStateString): [number, number] {
    return <[number, number]>({
        "": [0, 0],
        "journey/map": [1, 1],
        "journey": [1, 2],
        "settings": [2, 3],
        "about": [3, 4]
    })[pageStateString]
}
