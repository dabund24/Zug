import {PageState, PageStateString} from "./types";
import {
    displayJourneyModalFirstTime,
    displayJourneyTree,
    hideConnectionModal,
    hideLeafletModal,
    hideModal, showLeafletModal,
    showModal
} from "./display.js";
import {journeyOptions, setJourney, tryLockingJourneySearch, unlockJourneySearch} from "./memorizer.js";
import {hideLoadSlider, showLoadSlider, toast} from "./pageActions.js";
import {JourneyWithRealtimeData} from "hafas-client";

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

window.onpopstate = (ev) => {
    console.log(history.state)
    console.log(document.documentElement.getAttribute("data-state"))
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

export function pushState(path: PageStateString, refreshToken?: string) {
    if (refreshToken !== undefined) {
        window.history.pushState(<PageState>{state: path}, "", path + "?journey=" + refreshToken)
    } else {
        window.history.pushState(<PageState>{state: path}, "", path)
    }
}

export async function displaySharedJourney(token: string, withMap: boolean) {
    if (!tryLockingJourneySearch()) {
        return
    }
    showLoadSlider()
    toast("neutral", "Hole Verbindungsdaten", "Fetching connection data")
    await fetch("/api/refresh?token=" + token + "&lang=" + journeyOptions.language)
        .then(res => res.json())
        .then((refreshedResponse: [JourneyWithRealtimeData] | [null]) => {
            const refreshed = refreshedResponse[0]
            if (refreshed === null) {
                toast("error", "Token ist fehlerhaft", "token is incorrect")
                hideLoadSlider()
                return
            }
            setJourney(0, refreshed.journey)
            const origin = <string>refreshed.journey.legs[0].origin?.name
            const destination = <string>refreshed.journey.legs[refreshed.journey.legs.length - 1].destination?.name
            displayJourneyTree({children: [{journey: refreshed.journey, children: null}]}, [origin, destination])
            displayJourneyModalFirstTime(0, false)
            toast("success", "Verbindung gefunden", "found connection")
            if (withMap) {
                showLeafletModal()
            }
        }).catch(() => {
            toast("error", "Netzwerkfehler", "network error")
        })

    hideLoadSlider()
    unlockJourneySearch()
}
