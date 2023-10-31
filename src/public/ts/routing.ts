import {JourneyNode, JourneyTree, PageState, PageStateString} from "./types";
import {
    displayJourneyModalFirstTime,
    displayJourneyTree,
    hideConnectionModal,
    hideLeafletModal,
    hideModal, showLeafletModal,
    showModal
} from "./display.js";
import {
    journeyOptions,
    resetJourneys,
    selectedJourneys,
    setJourney,
    tryLockingJourneySearch,
    unlockJourneySearch
} from "./memorizer.js";
import {hideLoadSlider, showLoadSlider, toast} from "./pageActions.js";
import {Journey, JourneyWithRealtimeData} from "hafas-client";
import {selectJourney} from "./journeyMerge.js";

const path = <PageStateString>window.location.pathname.substring(1)
const journeyQuery = new URLSearchParams(window.location.search).get("journey")

window.history.replaceState(<PageState>{state: ""}, "", "/")
switch (path) {
    case "":
        break
    case "settings":
    case "about":
        showModal(path)
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
    switch (<PageStateString>document.documentElement.getAttribute("data-state")) {
        case "": return
        case "settings":
            hideModal("settings")
            break
        case "about":
            hideModal("about")
            break
        case "journey":
            hideConnectionModal()
            break
        case "journey/map":
            hideLeafletModal()
            break
    }
}

window.addEventListener("keydown", event => {
    if (event.key === "Escape" && (<PageState>history.state).state !== "") {
        history.back()
    }
})

export function pushState(path: PageStateString, refreshToken?: string) {
    if (refreshToken !== undefined) {
        refreshToken = btoa(refreshToken)
        window.history.pushState(<PageState>{state: path}, "", path + "?journey=" + refreshToken)
    } else {
        window.history.pushState(<PageState>{state: path}, "", path)
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
        const journeyPromise = fetch("/api/refresh?token=" + token + "&lang=" + journeyOptions.language)
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
    const journeys: Array<Journey | null> = []
    for (const journeyPromise of journeyPromises) {
        journeys.push(await journeyPromise)
    }

    // write journeys
    const stationNames: string[] = []
    resetJourneys(journeys.length)
    for (let i = 0; i < journeys.length; i++) {
        const journey = journeys[i]
        if (journey !== null) {
            setJourney(i, selectedJourneys[i], journey)
            stationNames.push(<string>journey.legs[0].origin?.name)
            if (i === journeys.length - 1) {
                stationNames.push(<string>journey.legs[journey.legs.length - 1].destination?.name)
            }
        } else {
            hideLoadSlider()
            unlockJourneySearch()
            return
        }
    }

    displayJourneyTree(getSimpleJourneyTree(<Journey[]>journeys), stationNames)
    for (let i = 0; i < journeys.length; i++) {
        selectJourney(i, 0)
    }
    displayJourneyModalFirstTime([0, journeys.length - 1], false)
    toast("success", "Verbindung gefunden", "found connection")
    if (withMap) {
        showLeafletModal()
    }

    hideLoadSlider()
    unlockJourneySearch()
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
