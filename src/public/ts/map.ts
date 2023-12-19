import {Feature, FeatureCollection, Journey, StopOver, Location, Line, Leg, Stop} from "hafas-client";
import {Position, MultiLineString, LineString, MultiPoint, Point} from "geojson"
import {FeatureGroup, featureGroup, GeoJSON, LatLngBounds, LayerGroup} from "leaflet";
import {dateDifference, timeToString} from "./util.js";
import {Product} from "./types.js";
import {
    getFirstLastStationPopupHTML,
    getCurrentLocationPopupHTML,
    getStopoverPopupHTML,
    getLinePopupHTML, getTransferPopupHTML, getWalkPopupHTML
} from "./mapPopups.js";

const map = L.map("map", {
    zoomControl: false
})
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    className: "osm-tiles"
}).addTo(map)

const ormLayer = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>, Style: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a> and OpenStreetMap',
    className: "orm-tiles"
})

let layer: LayerGroup = L.layerGroup();
layer.addTo(map)

map.attributionControl.setPosition("topright")

export function initMap(journey: Journey, withRezoom: boolean) {
    if (document.getElementById("map")!.getAttribute("data-orm") === "true") {
        ormLayer.addTo(map)
    } else {
        ormLayer.removeFrom(map)
    }
    layer.removeFrom(map)
    const [featureGr, bounds] = journeyToGeoJSON(journey)
    layer = featureGr
    layer.addTo(map)
    map.invalidateSize()
    if (withRezoom) {
        map.fitBounds(bounds, {paddingTopLeft: [20, 50], paddingBottomRight: [20, 100]})
    }
}

function journeyToGeoJSON(journey: Journey): [FeatureGroup, LatLngBounds] {
    const lines: GeoJSON[] = []
    const points: GeoJSON[] = []
    let previousLeg: Leg = {};

    for (let i = 0; i < journey.legs.length; i++) {
        const leg = journey.legs[i]
        if (leg.walking) {
            let transferTime = ""
            if (journey.legs[i - 1] !== undefined && journey.legs[i + 1] !== undefined) {
                transferTime = timeToString(dateDifference(journey.legs[i - 1].arrival!, journey.legs[i + 1].departure!));
            }
            const walkLine = walkToGeoJSON(leg, transferTime)
            if (walkLine.length === 1) {
                lines.push(walkLine[0])
            }
            continue
        } else if (leg.polyline === undefined) {
            continue
        }
        if (Object.keys(previousLeg).length !== 0 && legsShareTransfer(previousLeg, leg)) {
            const transferPoint = transferToGeoJSON(previousLeg, leg)
            if (transferPoint !== null) {
                points.push(transferPoint)
            }
        } else { // no overlap
            if (previousLeg.stopovers !== undefined) {
                const destinationPoint = stopoverToGeoJSON(previousLeg.stopovers[previousLeg.stopovers.length - 1], <Product>previousLeg.line?.product, true, false)
                if (destinationPoint !== null) {
                    points.push(destinationPoint)
                }
            }
            const originPoint = stopoverToGeoJSON(leg.stopovers![0], <Product>leg.line?.product, true, true)
            if (originPoint !== null) {
                points.push(originPoint)
            }
        }
        const popup = L.popup({
            className: "map__popup",
            closeButton: false
        }).setContent(getLinePopupHTML(leg))
        const lineString: LineString = {type: "LineString", coordinates: []}
        leg.polyline.features.forEach(feature => {
            lineString.coordinates.push(feature.geometry.coordinates)
        })
        lines.push(L.geoJSON(lineString, {
            style: {
                className: "connection-line--" + leg.line?.product + " stroke--product",
                "weight": 4
            }
        }).bindPopup(popup))
        points.push.apply(points, stopoversToGeoJSON(leg.stopovers, <Product>leg.line?.product))
        const currentLocationPoint = currentLocationToGeoJSON(leg.currentLocation, leg)
        if (currentLocationPoint !== null) {
            points.push(currentLocationPoint)
        }
        previousLeg = leg
    }
    if (previousLeg.stopovers !== undefined) {
        const destinationPoint = stopoverToGeoJSON(previousLeg.stopovers[previousLeg.stopovers.length - 1], <Product>previousLeg.line?.product, true, false)
        if (destinationPoint !== null) {
            points.push(destinationPoint)
        }
    }

    return [L.featureGroup(lines.concat(points)), L.featureGroup(lines).getBounds()]
}

function walkToGeoJSON(walk: Leg, transferTime: string) {
    const originLatitude = (<Stop>walk.origin).location?.latitude
    const originLongitude = (<Stop>walk.origin).location?.longitude
    const destinationLatitude = (<Stop>walk.destination).location?.latitude
    const destinationLongitude = (<Stop>walk.destination).location?.longitude
    if (originLatitude === undefined || originLongitude === undefined || destinationLatitude === undefined || destinationLongitude === undefined) {
        return []
    }
    const line: LineString = {type: "LineString", coordinates: [[originLongitude, originLatitude], [destinationLongitude, destinationLatitude]]}
    const popup = L.popup({
        className: "map__popup",
        closeButton: false
    }).setContent(getWalkPopupHTML(walk, transferTime))
    return [L.geoJSON(line, {
        style: {
            color: "var(--foreground-color)",
            weight: 4,
            dashArray: "0 8 0"
        }
    }).bindPopup(popup)]
}

function stopoversToGeoJSON(stopovers: readonly StopOver[] | undefined, product: Product) {
    const points: GeoJSON[] = []
    if (stopovers === undefined || stopovers.length < 2) {
        return []
    }
    for (let i = 1; i < stopovers.length - 1; i++) {
        const stopoverPoint = stopoverToGeoJSON(stopovers[i], product, false, false)
        if (stopoverPoint !== null) {
            points.push(stopoverPoint)
        }
    }
    return points
}

function transferToGeoJSON(arrivalLeg: Leg, departureLeg: Leg) {
    const arrivalStopover = arrivalLeg.stopovers![arrivalLeg.stopovers!.length - 1]
    const departureStopover = departureLeg.stopovers![0]
    const arrivalProduct = <Product>arrivalLeg.line?.product
    const departureProduct = <Product>departureLeg.line?.product


    const latitude = arrivalStopover.stop?.location?.latitude
    const longitude = arrivalStopover.stop?.location?.longitude
    if (longitude === undefined || latitude === undefined) {
        return null
    }
    const coordinates: [number, number] = [longitude, latitude]
    const point: Point = {type: "Point", coordinates: coordinates}
    console.log(arrivalStopover)
    console.log(departureStopover)
    const popup = L.popup({
        className: "map__popup",
        closeButton: false
    }).setContent(getTransferPopupHTML(arrivalStopover, departureStopover, arrivalProduct, departureProduct))
    return L.geoJSON(point, {
        pointToLayer: function (geoJsonPoint, latlng) {
            let markerHTML: string;
                markerHTML = "<svg width='16px' height='16px' xmlns='http://www.w3.org/2000/svg'>" +
                    "   <path d='M 0 8 A 8 8 0 0 1 16 8' fill='var(--product-color)' class='connection-line--" + arrivalProduct + "'/>" +
                    "   <path d='M 0 8 A 8 8 0 0 0 16 8' fill='var(--product-color)' class='connection-line--" + departureProduct + "'/>" +
                    "   <circle cx='8' cy='8' r='3.5' fill='transparent' stroke='var(--background-color)' stroke-width='3'/>" +
                    "</svg>"

            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "connection-line--" + arrivalProduct,
                    html: markerHTML,
                    iconAnchor: [8, 8]
                })
            }).bindPopup(popup)
        }
    })
}

function stopoverToGeoJSON(stopover: StopOver, product: Product, isMajor: boolean, isOrigin: boolean) {
    const latitude = stopover.stop?.location?.latitude
    const longitude = stopover.stop?.location?.longitude
    if (longitude === undefined || latitude === undefined) {
        return null
    }
    const coordinates: [number, number] = [longitude, latitude]
    const point: Point = {type: "Point", coordinates: coordinates}
    const popup = L.popup({
        className: "map__popup",
        closeButton: false
    }).setContent(isMajor ? getFirstLastStationPopupHTML(product, stopover, isOrigin) : getStopoverPopupHTML(product, stopover))
    return L.geoJSON(point, {
        pointToLayer: function (geoJsonPoint, latlng) {
            let markerHTML: string;
            let iconAnchor: [number, number]
            if (isMajor) {
                markerHTML = "<svg width='16px' height='16px' xmlns='http://www.w3.org/2000/svg'>\n" +
                    "    <circle cx='8' cy='8' r='6.5' stroke='var(--product-color)' stroke-width='3' fill='var(--background-color)'/>\n" +
                    "    <circle cx='8' cy='8' r='2' fill='var(--product-color)'/>\n" +
                    "</svg>"
                iconAnchor = [8, 8]
            } else {
                markerHTML = "<svg width='16px' height='16px' viewBox='-2 -2 16 16' xmlns='http://www.w3.org/2000/svg'>\n" +
                    "    <circle cx='6' cy='6' r='4.5' stroke='var(--product-color)' stroke-width='3' fill='var(--background-color)'/>\n" +
                    "</svg>"
                iconAnchor = [8, 8]
            }
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "connection-line--" + product,
                    html: markerHTML,
                    iconAnchor: iconAnchor
                })
            }).bindPopup(popup)
        }
    })
}

function currentLocationToGeoJSON(location: Location | undefined, leg: Leg) {
    const latitude = location?.latitude
    const longitude = location?.longitude
    if (latitude === undefined || longitude === undefined) {
        return null
    }
    const coordinates: [number, number] = [longitude, latitude]
    const point: Point = {type: "Point", coordinates: coordinates}
    const popup = L.popup({
        className: "map__popup",
        closeButton: false,

    }).setContent(getCurrentLocationPopupHTML(<Product>leg.line?.product, leg.line?.name, leg.direction))
    return L.geoJSON(point, {
        pointToLayer: function (geoJsonPoint, latlng) {
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "connection-line--" + leg.line?.product,
                    html: "<svg width='12px' height='12px' xmlns='http://www.w3.org/2000/svg'>\n" +
                        "    <circle cx='6' cy='6' r='5.5' fill='var(--background-color)' stroke='var(--foreground-color)'/>\n" +
                        "    <circle cx='6' cy='6' r='3' fill='var(--product-color)'/>\n" +
                        "</svg>",
                    iconAnchor: [6, 6]
                })
            }).bindPopup(popup)
        }
    })
}

export function legsShareTransfer(arrivalLeg: Leg, departureLeg: Leg) {
    if (arrivalLeg.stopovers === undefined || departureLeg.stopovers === undefined) {
        return false
    }
    const arrivalStopover = arrivalLeg.stopovers[arrivalLeg.stopovers.length - 1]
    const arrivalLocation = arrivalStopover.stop?.location
    const departureStopover = departureLeg.stopovers[0]
    const departureLocation = departureStopover.stop?.location
    return arrivalLocation?.longitude === departureLocation?.longitude && arrivalLocation?.latitude === departureLocation?.latitude
}
