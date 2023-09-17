import {HafasError, JourneyTree, ZugErrorType, ZugResponse} from "../public/ts/types.js";


export function respondNoError(journeyTree: JourneyTree): ZugResponse {
    return {
        isError: false,
        content: journeyTree
    }
}

export function respondErrorStations(errorType: ZugErrorType, stationA: number, stationB: number): ZugResponse {
    return {
        isError: true,
        content: {
            errorType: errorType,
            stationA: stationA,
            stationB: stationB
        }
    }
}

export function respondErrorNoStations(errorType: ZugErrorType): ZugResponse {
    return {
        isError: true,
        content: {
            errorType: errorType,
            stationA: -1,
            stationB: -1
        }
    }
}

export function respondHafasError(hafasError: HafasError | any, stationA: number, stationB: number): ZugResponse {
    if (hafasError.isHafasError) {
        return {
            isError: true,
            content: {
                errorType: <ZugErrorType>{
                    "ACCESS_DENIED": "hafasAccessDenied",
                    "INVALID_REQUEST": "hafasInvalidRequest",
                    "NOT_FOUND": "hafasNotFound",
                    "SERVER_ERROR": "hafasServer"
                }[(<HafasError>hafasError).code] || "hafasError",
                stationA: stationA,
                stationB: stationB
            }
        }
    } else {
        return {
            isError: true,
            content: {
                errorType: "networkError",
                stationA: -1,
                stationB: -1
            }
        }
    }
}
