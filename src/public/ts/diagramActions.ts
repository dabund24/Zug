import html2canvas from "html2canvas";
import {hideLoadSlider, showLoadSlider, toast} from "./pageActions";
import {displayedStations, getJourney} from "./memorizer";
import {dateToString} from "./util";

export function prepareDiagramActions() {
    document.getElementById("diagram-actions__screenshot-button")!.addEventListener("click", () => {
        showLoadSlider()
        const journeysElement = document.getElementById("diagram")!
        const info = document.createElement("div")
        info.innerText = dateToString(getJourney(0, 0).legs[0].departure!)
        info.className = "center padded-top-bottom"
        const attribution = document.createTextNode("https://github.com/dabund24/Zug")
        html2canvas(journeysElement, {
            ignoreElements: element => element.className === "background-transition--horizontal",
            onclone: (document, element) => {
                element.style.setProperty("--zoom", "10")
                element.prepend(info)
                element.appendChild(attribution)
            }
        }).then(canvas => {
            saveScreenshot(canvas.toDataURL())
            toast("success", "Bild erstellt", "created image")
            hideLoadSlider()
        })
    })

    document.getElementById("diagram-actions__plus-button")!.addEventListener("click", () => {
        modifyDiagramZoom(true)
    })
    document.getElementById("diagram-actions__minus-button")!.addEventListener("click", () => {
        modifyDiagramZoom(false)
    })

}

function saveScreenshot(uri: string) {
    const downloadLink = document.createElement("a")
    downloadLink.setAttribute("download", `${displayedStations.from?.name} – ${displayedStations.to?.name}.png`)
    downloadLink.setAttribute("href", uri)
    downloadLink.click()
}

function modifyDiagramZoom(zoomIn: boolean) {
    console.log("zoom in: " + zoomIn)
    const diagramContainer = document.getElementById("journeys")!
    const oldZoom = Number.parseInt(diagramContainer.style.getPropertyValue("--zoom"))
    console.log(oldZoom)
    if ((oldZoom === 6 && !zoomIn) || (oldZoom === 10 && zoomIn)) {
        return
    }
    diagramContainer.style.setProperty("--zoom", (zoomIn ? (oldZoom + 1) : (oldZoom - 1)).toString())
}

