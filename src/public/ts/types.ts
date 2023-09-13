import {Journey} from "hafas-client";

export type Color =
    | [0, "red"]
    | [1, "yellow"]
    | [2, "green"]
    | [3, "blue"]
    | [4, "purple"]
    | [5, "gray"]

export type Theme =
    | [0, "light"]
    | [1, "dark"]

export type ToasterType = "success" | "neutral" | "warning" | "error"

export type Language = "en" | "de"
export type Product =
    | "nationalExpress"
    | "national"
    | "regional"
    | "suburban"
    | "subway"
    | "tram"
    | "bus"
    | "ferry"
    | "taxi"
export type Accessibility = "none" | "partial" | "complete"
export type WalkingSpeed = "slow" | "normal" | "fast"
export type LoadFactor = "low-to-medium" | "high" | "very-high" | "exceptionally-high"

export type JourneyTree = {
    children: JourneyNode[]
}

export type JourneyNode = {
    journey: Journey,
    children: JourneyNode[] | null
}

export type ZugError = "noConnections" | "error"

export function isZugError(value: any) {
    console.log(value)
    return value === "noConnections" || value === "error"
}

export type TreeMatrixPair = [JourneyTree, Journey[][]]
