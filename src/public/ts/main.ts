import {Journey, Journeys, Station, Stop} from "hafas-client";
import {displayJourneys} from "./display.js";
import {hideLoadSlider, setColor, setTheme, showLoadSlider} from "./pageActions.js";
import {isArrival, saveJourney} from "./memorizer.js";

setColor([2, "green"])
setTheme([1, 'dark'])


export async function findConnections() {
    showLoadSlider();
    const fromStr = (<HTMLInputElement>document.getElementById("from__input")).value
    const toStr = (<HTMLInputElement>document.getElementById("to__input")).value

    const from: (Station | Stop)[] = await fetch("/api/stations?name=" + fromStr).then(res => res.json())
    const to: (Station | Stop)[] = await fetch("/api/stations?name=" + toStr).then(res => res.json())

    const fromID = from[0].id
    const toID = to[0].id

    if (fromID === undefined || toID === undefined) {
        return;
    }

    const isArrQuery = "&isArrival=" + isArrival
    let timeQuery = "";
    if ((<HTMLInputElement>document.getElementById("time__input")).value !== "") {
        timeQuery = "&time=" + (<HTMLInputElement>document.getElementById("time__input")).value
    }

    const journeys: Journeys = await fetch("/api/journeys?from=" + fromID + "&to=" + toID + timeQuery + isArrQuery).then(res => res.json());
    if (journeys === undefined || journeys.journeys === undefined) {
        hideLoadSlider();
        return;
    }

    displayJourneys(journeys, <string>from[0].name, <string>to[0].name)
    hideLoadSlider();
}

export function hideModal() {
    document.getElementById("connection-modal")!.style.setProperty("display", "none")
}