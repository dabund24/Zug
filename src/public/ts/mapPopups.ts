import {dateDifference, numberWithSign, timeToString, unixToHoursStringShort} from "./util.js";
import {Product} from "./types.js";
import {Leg, StopOver} from "hafas-client";
import {getPlatformHTML, getWalkHTML} from "./display.js";

export function getLinePopupHTML(leg: Leg) {
    const duration = timeToString(dateDifference(leg.departure!, leg.arrival!))
    return "<div class='flex-row'>" +
    "       <div class='popup__time time'>" +
    "           <i>" + duration + "</i>" +
    "       </div>" +
    "       <div class='popup__icon popup__icon--small connection-line--" + leg.line?.product + " flex-column'>" +
    "           <div class='connection-line line--vertical'></div>" +
    "       </div>" +
    "       <div class='popup__text flex-row'>" + leg.line?.name + " &rightarrow; " + leg.direction + "</div>" +
    "   </div>"
}

export function getWalkPopupHTML(walk: Leg, transferTime: string) {
    const duration = timeToString(dateDifference(walk.departure!, walk.arrival!))
    const walkHTML = getWalkHTML(walk.distance, duration)
    return "<div class='flex-row'>" +
        "       <div class='popup__time'>" +
        "           <i>" + transferTime + "</i>" +
        "       </div>" +
        "       <div class='popup__icon popup__icon--small flex-column'>" +
        "           <div class='connection-line connection-line--walk line--vertical'></div>" +
        "       </div>" +
        "       <div class='popup__text flex-row show-whitespace'>" + walkHTML + "</div>" +
        "   </div>"
}

export function getCurrentLocationPopupHTML(product: Product | undefined, name: string | undefined, direction: string | undefined) {
    return "<div class='flex-row'>" +
        "       <div class='popup__icon popup__icon--small connection-line--" + product + " flex-column'>" +
        "           <div class='popup__icon__middle'>" +
        "               <svg width='12px' height='12px' xmlns='http://www.w3.org/2000/svg'>" +
        "                   <circle cx='6' cy='6' r='5.5' fill='var(--background-color)' stroke='var(--foreground-color)'/>" +
        "                   <circle cx='6' cy='6' r='3' fill='var(--product-color)'/>" +
        "               </svg>" +
        "           </div>" +
        "       </div>" +
        "       <div class='popup__text'>" + name + " &rightarrow; " + direction + "</div>\n" +
        "   </div>"
}

export function getStopoverPopupHTML(product: Product | undefined, stopover: StopOver) {
    const arrival = stopover.arrival !== undefined ? unixToHoursStringShort(stopover.arrival) : ""
    const departure = stopover.departure !== undefined ? unixToHoursStringShort(stopover.departure) : ""
    let arrivalDelayClass = ""
    let arrivalDelay = ""
    if (stopover.arrivalDelay !== undefined && stopover.arrivalPrognosisType !== undefined && stopover.arrivalDelay !== null) {
        arrivalDelayClass = stopover.arrivalDelay <= 300 ? "on-time" : "delayed"
        arrivalDelay = "<span class='" + arrivalDelayClass + "'> (" + numberWithSign(stopover.arrivalDelay / 60) + ")</span>"
    }
    let departureDelayClass = ""
    if (stopover.departureDelay !== undefined && stopover.departurePrognosisType !== undefined && stopover.departureDelay !== null) {
        departureDelayClass = stopover.departureDelay <= 300 ? "on-time" : "delayed"
    }
    const platformClass = stopover.arrivalPlatform !== stopover.plannedArrivalPlatform ? "delayed" : ""
    let platform = ""
    if (stopover.arrivalPlatform !== undefined && stopover.arrivalPlatform !== null) {
        platform = "<div class='platform " + platformClass + "'>" + getPlatformHTML(stopover.arrivalPlatform) + "</div>"
    }
    return "<div class='flex-row'>" +
        "       <div class='popup__time time'>" +
        "           <div class='" + arrivalDelayClass + "'>" + arrival + "</div>" + "<div class='" + departureDelayClass + "'>" + departure + "</div>" +
        "       </div>" +
        "       <div class='popup__icon popup__icon--small connection-line--" + product + " flex-column'>" +
        "           <div class='connection-line line--vertical'></div>" +
        "           <div class='popup__icon__middle'>" +
        "               <svg width='12px' height='12px' xmlns='http://www.w3.org/2000/svg'>\n" +
        "                   <circle cx='6' cy='6' r='4.5' stroke='var(--product-color)' stroke-width='3' fill='var(--background-color)'/>\n" +
        "               </svg>" +
        "           </div>" +
        "       </div>" +
        "       <div class='popup__text flex-row'><div>" +  stopover.stop?.name + arrivalDelay + "</div>" + platform + "</div>\n" +
        "   </div>"
}

export function getFirstLastStationPopupHTML(product: Product, stopover: StopOver, isFirstStation: boolean) {
    let arrivalDepartureScheduled: string
    let arrivalDepartureActual = ""
    let arrivalDepartureDelay = ""
    let arrivalDepartureDelayClass = ""
    let platform = ""
    let platformClass: string;
    if (isFirstStation) {
        arrivalDepartureScheduled = stopover.plannedDeparture !== undefined ? unixToHoursStringShort(stopover.plannedDeparture) : ""
        if (stopover.departureDelay !== undefined && stopover.departurePrognosisType !== undefined && stopover.departureDelay !== null) {
            arrivalDepartureActual = unixToHoursStringShort(stopover.departure)
            arrivalDepartureDelayClass = stopover.departureDelay <= 300 ? "on-time" : "delayed"
            arrivalDepartureDelay = "<span class='" + arrivalDepartureDelayClass + "'> (" + numberWithSign(stopover.departureDelay / 60) + ")</span>"
        }
        platformClass = stopover.departurePlatform !== stopover.plannedDeparturePlatform ? "delayed" : ""
        if (stopover.departurePlatform !== undefined && stopover.departurePlatform !== null) {
            platform = "<div class='platform " + platformClass + "'>" + getPlatformHTML(stopover.departurePlatform) + "</div>"
        }
    } else {
        arrivalDepartureScheduled = stopover.plannedArrival !== undefined ? unixToHoursStringShort(stopover.plannedArrival) : ""
        if (stopover.arrivalDelay !== undefined && stopover.arrivalPrognosisType !== undefined && stopover.arrivalDelay !== null) {
            arrivalDepartureActual = unixToHoursStringShort(stopover.arrival)
            arrivalDepartureDelayClass = stopover.arrivalDelay <= 300 ? "on-time" : "delayed"
            arrivalDepartureDelay = "<span class='" + arrivalDepartureDelayClass + "'> (" + numberWithSign(stopover.arrivalDelay / 60) + ")</span>"
        }
        platformClass = stopover.arrivalPlatform !== stopover.plannedArrivalPlatform ? "delayed" : ""
        if (stopover.arrivalPlatform !== undefined && stopover.arrivalPlatform !== null) {
            platform = "<div class='platform " + platformClass + "'>" + getPlatformHTML(stopover.arrivalPlatform) + "</div>"
        }
    }
    return "<div class='flex-row'>" +
        "       <div class='popup__time time'>" +
        "           <div>" + arrivalDepartureScheduled + "</div>" + "<div class='" + arrivalDepartureDelayClass + "'>" + arrivalDepartureActual + "</div>" +
        "       </div>" +
        "       <div class='popup__icon popup__icon--small connection-line--" + product + " flex-column'>" +
        "           <div class='connection-line connection-line--" + (isFirstStation ? "invisible" : "visible") + " line--vertical'></div>" +
        "           <div class='connection-line connection-line--" + (isFirstStation ? "visible" : "invisible") + " line--vertical'></div>" +
        "           <div class='popup__icon__middle'>" +
        "               <svg width='16px' height='16px' xmlns='http://www.w3.org/2000/svg'>\n" +
        "                   <circle cx='8' cy='8' r='6.5' stroke='var(--product-color)' stroke-width='3' fill='var(--background-color)'/>\n" +
        "                   <circle cx='8' cy='8' r='2' fill='var(--product-color)'/>\n" +
        "               </svg>" +
        "           </div>" +
        "       </div>" +
        "       <div class='popup__text flex-row'><div>" +  stopover.stop?.name + arrivalDepartureDelay + "</div>" + platform + "</div>\n" +
        "   </div>"
}

export function getTransferPopupHTML(arrivalStopover: StopOver, departureStopover: StopOver, arrivalProduct: Product, departureProduct: Product) {
    const arrival = arrivalStopover.arrival !== undefined ? unixToHoursStringShort(arrivalStopover.arrival) : ""
    const departure = departureStopover.departure !== undefined ? unixToHoursStringShort(departureStopover.departure) : ""
    let arrivalDelayClass = ""
    let arrivalDelay = ""
    if (arrivalStopover.arrivalDelay !== undefined && arrivalStopover.arrivalPrognosisType !== undefined && arrivalStopover.arrivalDelay !== null) {
        arrivalDelayClass = arrivalStopover.arrivalDelay <= 300 ? "on-time" : "delayed"
        arrivalDelay = "<span class='" + arrivalDelayClass + " show-whitespace'> (" + numberWithSign(arrivalStopover.arrivalDelay / 60) + ")</span>"
    }
    const arrivalPlatformClass = arrivalStopover.arrivalPlatform !== arrivalStopover.plannedArrivalPlatform ? "delayed" : ""
    let arrivalPlatform = ""
    if (arrivalStopover.arrivalPlatform !== undefined && arrivalStopover.arrivalPlatform !== null) {
        arrivalPlatform = "<div class='platform " + arrivalPlatformClass + "'>" + getPlatformHTML(arrivalStopover.arrivalPlatform) + "</div>"
    }
    let departureDelayClass = ""
    let departureDelay = ""
    if (departureStopover.departureDelay !== undefined && departureStopover.departurePrognosisType !== undefined && departureStopover.departureDelay !== null) {
        departureDelayClass = departureStopover.departureDelay <= 300 ? "on-time" : "delayed"
        departureDelay = "<span class='" + departureDelayClass + " align-bottom show-whitespace'> (" + numberWithSign(departureStopover.departureDelay / 60) + ")</span>"
    }
    const departurePlatformClass = departureStopover.departurePlatform !== departureStopover.plannedDeparturePlatform ? "delayed" : ""
    let departurePlatform = ""
    if (departureStopover.departurePlatform !== undefined && departureStopover.departurePlatform !== null) {
        departurePlatform = "<div class='platform " + departurePlatformClass + " align-bottom'>" + getPlatformHTML(departureStopover.departurePlatform) + "</div>"
    }

    return "<div class='flex-row'>" +
        "       <div class='popup__time time'>" +
        "           <div class='" + arrivalDelayClass + "'>" + arrival + "</div>" + "<div class='" + departureDelayClass + "'>" + departure + "</div>" +
        "       </div>" +
        "       <div class='popup__icon popup__icon--small flex-column'>" +
        "           <div class='connection-line connection-line--" + arrivalProduct + " connection-line--visible line--vertical'></div>" +
        "           <div class='connection-line connection-line--" + departureProduct + " connection-line--visible line--vertical'></div>" +
        "           <div class='popup__icon__middle'>" +
        "               <svg width='16px' height='16px' xmlns='http://www.w3.org/2000/svg'>\n" +
        "                   <path d='M 0 8 A 8 8 0 0 1 16 8' fill='var(--product-color)' class='connection-line--" + arrivalProduct + "'/>" +
        "                   <path d='M 0 8 A 8 8 0 0 0 16 8' fill='var(--product-color)' class='connection-line--" + departureProduct + "'/>" +
        "                   <circle cx='8' cy='8' r='3.5' fill='transparent' stroke='var(--background-color)' stroke-width='3'/>" +
        "               </svg>" +
        "           </div>" +
        "       </div>" +
        "       <div class='popup__text flex-row'>" +
        "           <div class='align-center'>" + arrivalStopover.stop?.name + "</div>" +
        "           <div class='flex-column'>" + arrivalDelay + departureDelay + "</div>" +
        "           <div class='flex-column'>" + arrivalPlatform + departurePlatform + "</div>" +
        "       </div>" +
        "   </div>"
}
