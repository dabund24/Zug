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

export type ZugErrorDescription = {
    errorType: ZugErrorType,
    stationA: number,
    stationB: number
}

export type HafasError = {
    isHafasError: true,
    code: "ACCESS_DENIED" | "INVALID_REQUEST" | "NOT_FOUND" | "SERVER_ERROR"
}

export type ZugErrorType =
    | "hafasAccessDenied"
    | "hafasInvalidRequest"
    | "hafasNotFound"
    | "hafasServer"
    | "hafasError"
    | "noConnections"
    | "missingField"
    | "networkError"
    | "error"

export function isZugError(value: any) {
    console.log(value)
    return value === "noConnections" || value === "error"
}

export type ZugResponse = ZugSuccess | ZugError

type ZugSuccess = {
    isError: false,
    content: JourneyTree
}

type ZugError = {
    isError: true,
    content: ZugErrorDescription
}

export type TreeMatrixPair = [JourneyTree, Journey[][]]
