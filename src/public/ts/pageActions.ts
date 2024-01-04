import {ToasterType} from "./types";
import {addClassToChildOfParent, setHTMLOfChildOfParent} from "./util";

const indicators = document.getElementsByClassName("indicator")
for (let i = 0; i < indicators.length; i++) {
    const indicator = indicators[i]
    indicator.addEventListener("animationend", () => {
        indicator.classList.remove("indicator__animation-to-right")
        indicator.classList.remove("indicator__animation-to-left")
    })
}

export function slideIndicator(indicatorID: string, selectableCount: number, start: number, end: number): void {
    const indicator = document.getElementById(indicatorID)!

    indicator.classList.remove("indicator__animation-to-right")
    indicator.classList.remove("indicator__animation-to-left")
    indicator.offsetWidth

    if (start < end) {
        indicator.classList.add("indicator__animation-to-right")
    } else {
        indicator.classList.add("indicator__animation-to-left")
    }

    indicator.style.setProperty("--animation--tab-indicator__start", `calc(${100 * start + 50}% / ${selectableCount})`)
    indicator.style.setProperty("--animation--tab-indicator__end", `calc(${100 * end + 50}% / ${selectableCount})`)
}

export function addSelectableEvents<T>(parentID: string, func: ((newValue: T) => void), newValues: T[]) {
    const buttons = document.getElementById(parentID)!.querySelectorAll("button")
    for (let i = 0; i < newValues.length; i++) {
        buttons[i].addEventListener("click", () => func(newValues[i]))
    }
}

export function showLoadSlider(): void {
    document.documentElement.classList.add("loading")
}

export function hideLoadSlider(): void {
    document.documentElement.classList.remove("loading")
}

export function toast(type: ToasterType, messageDe: string, messageEn: string) {
    const template = (<HTMLTemplateElement>document.getElementById("toast-template")).content
    const toBeAdded = document.importNode(template, true)
    const target = document.getElementById("toasts")!
    setHTMLOfChildOfParent(toBeAdded, ".toast__text", "<span class='de'>" + messageDe + "</span><span class='en'>" + messageEn + "</span>")
    addClassToChildOfParent(toBeAdded, ".line--accent", "line--" + type)
    const toastLine = toBeAdded.querySelector(".toast__line")!
    const toastElement = toBeAdded.firstElementChild!
    toastLine.addEventListener("animationend", () => {
        toastElement.remove()
    })
    target.appendChild(toBeAdded)
}
