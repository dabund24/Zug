import {Color, Theme} from "./types.js";

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
    if (document.documentElement.getAttribute("data-theme") === theme[1]) {
        return
    }
    slideIndicator("theme-indicator", 2, theme[0] === 0 ? 1 : 0, theme[0])

    document.documentElement.setAttribute("data-theme", theme[1]);
    //fetch("/setCookie?key=theme&value=" + theme)
}

let currentColor: Color = [0, "red"]
export function setColor(color: Color) {
    if (color === currentColor) {
        return;
    }

    slideIndicator("color-indicator", 6, currentColor[0], color[0])

    currentColor = color;
    document.documentElement.setAttribute("data-color", color[1]);
    //fetch("/setcookie?key=color&value=" + color)
}
