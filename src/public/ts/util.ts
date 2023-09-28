import {Product} from "./types";

/**
 * adds, if necessary, leading zeroes to a number to reach an amount of digits
 * @param {number} number - the number that needs leading zeroes
 * @param {number} digits - the amount of digits the number is supposed to have
 * @returns {string} - the number with leading zeroes
 */
export function leadingZeros(number: number, digits: number): string {
    return String(number).padStart(digits, '0');
}

export function numberWithSign(number: number): string {
    return new Intl.NumberFormat("de-DE", {
        signDisplay: "always"
    }).format(number)
}

/**
 * converts unix timestamp to human-readable string in German
 * @param {number} unix - timestamp
 * @returns {string} - a string following this scheme: `hh.mm Uhr`
 */
export function unixToHoursString(unix: string | number | Date | undefined): string {
    if (unix === undefined) {
        unix = new Date(0);
    }
    let date = new Date(unix);
    return leadingZeros(date.getHours(), 2) + "." + leadingZeros(date.getMinutes(), 2) + " Uhr"
}

/**
 * converts unix timestamp to human-readable string in German
 * @param {number} unix - timestamp
 * @returns {string} - a string following this scheme: `hh.mm Uhr`
 */
export function unixToHoursStringShort(unix: string | number | Date | undefined): string {
    if (unix === undefined) {
        unix = new Date(0);
    }
    let date = new Date(unix);
    return leadingZeros(date.getHours(), 2) + "." + leadingZeros(date.getMinutes(), 2)
}

export function dateDifference(sooner: string | number | Date, later: string | number | Date): [number, number] {
    let dateA = new Date(sooner).getTime()
    let dateB = new Date(later).getTime()
    const difference = dateB - dateA;
    return [(difference / 60000) % 60, Math.floor(difference / 3600000)]
}

export function timeToString(time: [number, number]) {
    if (time[1] === 0) {
        return time[0] + "min"
    } else {
        return time[1] + "h " + time[0] + "min"
    }
}

export function dateToString(date: string | number | Date) {
    const dateA = new Date(date)
    return dateA.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    })
}

/**
 * adds a class to a child of a parent
 * @param {DocumentFragment} parent - the parent
 * @param {string} childSelector - a selector of the child
 * @param {string} newClass - the class the child should have
 */
export function addClassToChildOfParent(parent: HTMLElement | DocumentFragment, childSelector: string, newClass: string): void {
    if (newClass !== "") {
        parent.querySelector(childSelector)!.classList.add(newClass);
    }
}

/**
 * replaces the class `wi-na` of a child of a parent
 * @param {HTMLElement} parent - the parent
 * @param {string} childSelector - a selector of the child
 * @param {string} newClass - the class that should replace `wi-na`
 */
export function replaceNaClassOfChildOfParent(parent: Element | DocumentFragment, childSelector: string, newClass: string | undefined): void {
    if (newClass === undefined) {
        return;
    }
    parent.querySelector(childSelector)!.classList.replace("wi-na", newClass);
}

/**
 * sets the innerHTML of a child of a parent
 * @param {HTMLElement} parent - the parent
 * @param {string} childSelector - a selector of the child
 * @param {string} innerHTML - the innerHTML the child should have
 */
export function setHTMLOfChildOfParent(parent: Element | DocumentFragment, childSelector: string, innerHTML: string | undefined): void {
    if (parent != null && innerHTML !== undefined) {
        parent.querySelector(childSelector)!.innerHTML = innerHTML;
    }
}

export function getProductColor(product: Product | undefined): string {
    switch (product) {
        case "suburban": return "#408335"
        case "subway": return "#1455C0"
        case "tram": return "#A9455D"
        case "bus": return "#814997"
        case "ferry": return "#309FD1"
        case "taxi": return "#FFD800"
        case "regional": return "#EC0016"
        case "regionalExpress": return "#F39200"
        case "national": return "#646973"
        case "nationalExpress": return "#000000"
        case undefined: return "#000000"
    }
}
