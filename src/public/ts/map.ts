import {Feature, FeatureCollection, Journey, StopOver, Location, Line, Leg} from "hafas-client";
import {Position, MultiLineString, LineString, MultiPoint, Point} from "geojson"
import {FeatureGroup, featureGroup, GeoJSON, LatLngBounds, LayerGroup} from "leaflet";
import {getProductColor} from "./util.js";
import {Product} from "./types.js";
import {getLinePopupHTML} from "./mapPopups.js";

const map = L.map("map", {
    zoomControl: false
})
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    className: "map-tiles"
}).addTo(map)

let layer: LayerGroup = L.layerGroup();
layer.addTo(map)

export function initMap(journey: Journey, withRezoom: boolean) {
    layer.removeFrom(map)
    const [featureGr, bounds] = journeyToGeoJSON(journey)
    layer = featureGr
    layer.addTo(map)
    map.invalidateSize()
    if (withRezoom) {
        map.fitBounds(bounds)
    }
}

function journeyToGeoJSON(journey: Journey): [FeatureGroup, LatLngBounds] {
    const lines: GeoJSON[] = []
    const points: GeoJSON[] = []


    for (let leg of journey.legs) {
        if (leg.polyline === undefined) {
            continue
        }
        const lineString: LineString = {type: "LineString", coordinates: []}
        leg.polyline.features.forEach(feature => {
            lineString.coordinates.push(feature.geometry.coordinates)
        })
        lines.push(L.geoJSON(lineString, {
            style: {
                className: "connection-line--" + leg.line?.product + " stroke--product",
                "weight": 4,
            }
        }))
        points.push.apply(points, stopoversToGeoJSON(leg.stopovers, <Product>leg.line?.product))
        const currentLocationPoint = currentLocationToGeoJSON(leg.currentLocation, leg)
        if (currentLocationPoint !== null) {
            points.push(currentLocationPoint)
        }
    }

    console.log(lines)
    return [L.featureGroup(lines.concat(points)), L.featureGroup(lines).getBounds()]
}

function stopoversToGeoJSON(stopovers: readonly StopOver[] | undefined, product: Product) {
    const points: GeoJSON[] = []
    if (stopovers === undefined || stopovers.length < 2) {
        return []
    }
    for (let i = 1; i < stopovers.length - 1; i++) {
        const stopoverPoint = stopoverToGeoJSON(stopovers[i], product, false)
        if (stopoverPoint !== null) {
            points.push(stopoverPoint)
        }
    }
    const originPoint = stopoverToGeoJSON(stopovers[0], product, true)
    if (originPoint !== null) {
        points.push(originPoint)
    }
    const destinationPoint = stopoverToGeoJSON(stopovers[stopovers.length - 1], product, true)
    if (destinationPoint !== null) {
        points.push(destinationPoint)
    }
    return points
}

function stopoverToGeoJSON(stopover: StopOver, product: Product, isMajor: boolean) {
    const latitude = stopover.stop?.location?.latitude
    const longitude = stopover.stop?.location?.longitude
    if (longitude === undefined || latitude === undefined) {
        return null
    }
    const coordinates: [number, number] = [longitude, latitude]
    const point: Point = {type: "Point", coordinates: coordinates}
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
                markerHTML = "<svg width='12px' height='12px' xmlns='http://www.w3.org/2000/svg'>\n" +
                    "    <circle cx='6' cy='6' r='4.5' stroke='var(--product-color)' stroke-width='3' fill='var(--background-color)'/>\n" +
                    "</svg>"
                iconAnchor = [6, 6]
            }
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "connection-line--" + product,
                    html: markerHTML,
                    iconAnchor: iconAnchor
                })
            })
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

    }).setContent(getLinePopupHTML(<Product>leg.line?.product, leg.line?.name, leg.direction))
    return L.geoJSON(point, {
        pointToLayer: function (geoJsonPoint, latlng) {
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "connection-line--" + leg.line?.product,
                    html: "<svg width='12px' height='12px' xmlns='http://www.w3.org/2000/svg'>\n" +
                        "    <circle cx='6' cy='6' r='6' fill='var(--background-color)'/>\n" +
                        "    <circle cx='6' cy='6' r='3' fill='var(--product-color)'/>\n" +
                        "</svg>",
                    iconAnchor: [6, 6]
                })
            }).bindPopup(popup)
        }
    })
}

