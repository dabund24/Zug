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

export type JourneyTree = {
    children: JourneyNode[]
}

export type JourneyNode = {
    journey: Journey,
    children: JourneyNode[] | null
}

export type ZugError = "error"

export type TreeMatrixPair = [JourneyTree, Journey[][]]
