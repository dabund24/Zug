import {Color, Language, Theme, ToasterType} from "./types.js";
import {addClassToChildOfParent, setHTMLOfChildOfParent} from "./util.js";
import {settings} from "./memorizer.js";

export function slideIndicator(indicatorID: string, selectableCount: number, start: number, end: number): void {
    const indicator = document.getElementById(indicatorID)!

    indicator.classList.remove("indicator__animation-to-right")
    indicator.classList.remove("indicator__animation-to-left")
    indicator.offsetWidth

    if (start < end) {
        indicator.classList.add("indicator__animation-to-right");
    } else {
        indicator.classList.add("indicator__animation-to-left")
    }

    indicator.style.setProperty("--animation--tab-indicator__start", "calc(" + (100 * start + 50) + "% / " + selectableCount + ")")
    indicator.style.setProperty("--animation--tab-indicator__end", "calc(" + (100 * end + 50) + "% / " + selectableCount + ")")
}

export function showLoadSlider(): void {
    document.querySelector(":root")!.classList.add("loading")
}

export function hideLoadSlider(): void {
    document.querySelector(":root")!.classList.remove("loading")
}

export function setTheme(theme: Theme) {
    if (settings.displaySettings.theme[1] === theme[1]) {
        return
    }
    slideIndicator("theme-indicator", 2, theme[0] === 0 ? 1 : 0, theme[0])

    document.documentElement.setAttribute("data-theme", theme[1]);
    settings.displaySettings.theme = theme
}

export function setColor(color: Color) {
    const currentColor = settings.displaySettings.color
    if (color === currentColor) {
        return;
    }

    slideIndicator("color-indicator", 6, currentColor[0], color[0])
    settings.displaySettings.color = color
    document.documentElement.setAttribute("data-color", color[1]);
}

export function setORMLayerAppearance(show: boolean) {
    if (show === settings.displaySettings.ormLayer) {
        return
    }

    slideIndicator("orm-indicator", 2, show ? 0 : 1, show ? 1 : 0)
    document.getElementById("map")!.setAttribute("data-orm", "" + show)
    settings.displaySettings.ormLayer = show
}

export function toast(type: ToasterType, messageDe: string, messageEn: string) {
    const template = (<HTMLTemplateElement>document.getElementById("toast-template")).content
    const toBeAdded = document.importNode(template, true)
    const target = document.getElementById("toasts")!
    setHTMLOfChildOfParent(toBeAdded, ".toast__text", "<span class='de'>" + messageDe + "</span><span class='en'>" + messageEn + "</span>")
    addClassToChildOfParent(toBeAdded, ".line--accent", "line--" + type)
    target.appendChild(toBeAdded)
    setTimeout(() => {
        const toBeRemoved = target.querySelector(".toast")
        if (toBeRemoved !== null) {
            target.removeChild(target.querySelector(".toast")!)
        }
    }, 3000)
}
