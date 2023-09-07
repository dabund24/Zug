import {Journey, Journeys, Station, Stop} from "hafas-client";
import {displayJourneyTree} from "./display.js";
import {hideLoadSlider, setColor, setTheme, showLoadSlider} from "./pageActions.js";
import {isArrival, saveJourney} from "./memorizer.js";
import {JourneyTree, TreeMatrixPair} from "./types";

setColor([2, "green"])
setTheme([1, 'dark'])


export async function findConnections() {
    showLoadSlider();
    const fromStr = (<HTMLInputElement>document.getElementById("from__input")).value
    const vias: string[] = []
    const viaNames: string[] = []
    for (let i = 0; i < 3; i++) {
        const viaStr = (<HTMLInputElement>document.getElementById("via" + (i + 1) + "__input")).value
        if (viaStr === "") {
            continue
        }

        const via: (Station | Stop)[] = await fetch("/api/stations?name=" + viaStr).then(res => res.json())
        const viaID = via[0].id
        if (viaStr !== "" && viaID !== undefined) {
            vias.push(viaID)
            viaNames.push(via[0].name!)
        }
    }
    //const viaStr = (<HTMLInputElement>document.getElementById("via1__input")).value
    const toStr = (<HTMLInputElement>document.getElementById("to__input")).value

    const from: (Station | Stop)[] = await fetch("/api/stations?name=" + fromStr).then(res => res.json())
    const to: (Station | Stop)[] = await fetch("/api/stations?name=" + toStr).then(res => res.json())

    const fromID = from[0].id
    //let viaID = via[0].id
    const toID = to[0].id

    if (fromID === undefined || toID === undefined) {
        return;
    }

    const isArrQuery = "&isArrival=" + isArrival
    let timeQuery = "";
    if ((<HTMLInputElement>document.getElementById("time__input")).value !== "") {
        timeQuery = "&time=" + (<HTMLInputElement>document.getElementById("time__input")).value
    }
    let viasQuery = "&vias=" + JSON.stringify(vias)

    const pair: TreeMatrixPair = await fetch("/api/journeys?from=" + fromID + viasQuery + "&to=" + toID + timeQuery + isArrQuery).then(res => res.json());
    console.log(pair[1])
    const journeyTree = pair[0]

    console.log(journeyTree)
    const journeys = journeyTree.children.map(child => child.journey)

    if (journeys === undefined) {
        hideLoadSlider();
        console.log("no :(")
        return;
    }

    displayJourneyTree(journeyTree, [<string> from[0].name, viaNames, <string> to[0].name].flat())
    hideLoadSlider();
}

export function hideModal() {
    document.getElementById("connection-modal")!.style.setProperty("display", "none")
}