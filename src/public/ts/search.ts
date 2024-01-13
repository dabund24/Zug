import {addClassToChildOfParent, setHTMLOfChildOfParent} from "./util";
import {Location, Station, Stop} from "hafas-client";
import {searchInputValues, setDepArr, settings} from "./memorizer";
import {DisplayedDiagramData, SearchObject} from "./types";
import {addSelectableEvents} from "./pageActions";
import {findConnections} from "./main";


let selectedSuggestion = 0
let suggestions: SearchObject[] = []

export function setupSearch() {
    const clearButtons = document.getElementsByClassName("search__icon--clear")
    for (let i = 0; i < clearButtons.length; i++) {
        clearButtons[i].addEventListener("click", () => clickSuggestion(undefined, i))
    }
    addSelectableEvents("search__departure-arrival-buttons", setDepArr, [0, 1])
    document.getElementById("search__find-button")!.addEventListener("click", () => {
        const timeInput = <HTMLInputElement> document.getElementById("time__input")
        const diagramData: DisplayedDiagramData = {
            stations: searchInputValues,
            time: timeInput.value === "" ? new Date(Date.now()).toISOString() : timeInput.value,
            isArrival: settings.isArrival,
            options: settings.journeysSettings
        }
        findConnections(diagramData)
    })

    const searchInputs = <HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName("search--autocomplete")
    const suggestionsContainers = document.getElementsByClassName("search__suggestions")

    for (let i = 0; i < suggestionsContainers.length; i++) {
        const searchInput = searchInputs.item(i)!
        const suggestionsContainer = suggestionsContainers.item(i)!

        searchInput.addEventListener("focusin", function (this: HTMLInputElement) {
            selectedSuggestion = 0
            refreshAutocomplete(this.value, i);
        })

        searchInput.addEventListener("keyup", function (this: HTMLInputElement, event) {
            if (event.key !== "Enter" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                refreshAutocomplete(this.value, i);
            }
        });

        searchInput.addEventListener("keydown", function (event){
            if (event.key === "Escape") {
                searchInput.blur()
            } else if (event.key === "Enter") {
                clickSuggestion(suggestions[selectedSuggestion], i);
                searchInput.blur();
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                changeSuggestionFocus(suggestionsContainer.children, selectedSuggestion + 1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                changeSuggestionFocus(suggestionsContainer.children, selectedSuggestion - 1);
            }
        });
    }
}

export async function refreshAutocomplete(text: string, inputIndex: number) {
    if (text === "") {
        (<HTMLElement>document.getElementsByClassName("search__icon--clear").item(inputIndex)).style.setProperty("display", "none")
        document.getElementsByClassName("search__suggestions").item(inputIndex)!.replaceChildren();
        suggestions = []
        displaySearchSuggestions(inputIndex);
        return;
    }
    (<HTMLElement>document.getElementsByClassName("search__icon--clear").item(inputIndex)).style.setProperty("display", "flex")
    const searchResults = <(Station | Stop | Location)[]> await fetch("/api/stations?name=" + text + "&options=" + JSON.stringify(settings.locationsSettings)).then(res => res.json())
    suggestions = searchResults.map(result => parseStationStopLocation(result))
    displaySearchSuggestions(inputIndex);
}

export function displaySearchSuggestions(inputIndex: number) {
    const suggestionsTarget = <HTMLElement>document.getElementsByClassName("search__suggestions").item(inputIndex)!
    suggestionsTarget.replaceChildren()
    const template = (<HTMLTemplateElement>document.getElementById("suggestion-template")).content
    let toBeAdded
    for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i]
        toBeAdded = document.importNode(template, true);
        addClassToChildOfParent(toBeAdded, ".mini-icon-container", `mini-icon-container--${suggestion.type}`)
        setHTMLOfChildOfParent(toBeAdded, ".option__text", suggestion.name)
        toBeAdded.querySelector(".search__suggestion__click")!.setAttribute("value", "" + i);
        toBeAdded.querySelector(".option")!.addEventListener("click", function () {
            clickSuggestion(suggestion, inputIndex);
        });
        suggestionsTarget.appendChild(toBeAdded)
    }
    if (selectedSuggestion >= suggestionsTarget.children.length) {
        changeSuggestionFocus(suggestionsTarget.children, suggestionsTarget.childElementCount - 1);
    }
    if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
        suggestionsTarget.children[selectedSuggestion].classList.add("option--focus");
    }
}

export function clickSuggestion(suggestion: SearchObject | undefined, inputIndex: number) {
    const input = (<HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName("search__input")).item(inputIndex)!
    const suggestionText = suggestion === undefined ? "" : suggestion.name

    input.value = suggestionText
    switch (inputIndex) {
        case 0:
            searchInputValues.from = suggestion
            break
        case 4:
            searchInputValues.to = suggestion
            break
        default:
            searchInputValues.vias[inputIndex - 1] = suggestion
    }
    setSearchIcons(inputIndex, suggestion?.type)
    refreshAutocomplete(suggestionText, inputIndex);
    if (suggestion === undefined) {
        input.focus()
    }
}

function changeSuggestionFocus(suggestionContainers: HTMLCollection, toBeFocused: number) {
    if (toBeFocused < 0) {
        toBeFocused = suggestions.length - 1;
    } else if (toBeFocused >= suggestions.length) {
        toBeFocused = 0;
    }
    if (toBeFocused < 0) {
        return;
    }
    if (selectedSuggestion < suggestionContainers.length && selectedSuggestion >= 0) {
        suggestionContainers[selectedSuggestion].classList.remove("option--focus");
    }
    selectedSuggestion = toBeFocused;
    suggestionContainers[selectedSuggestion].classList.add("option--focus");
}

export function parseStationStopLocation(ssl: Station | Stop | Location): SearchObject {
    if (ssl.type === "station" || ssl.type === "stop") {
        return {name: ssl.name!, requestParameter: JSON.stringify(ssl.id), type: "station", longitude: ssl.location?.longitude!, latitude: ssl.location?.latitude!}
    } else if (ssl.poi) {
        return {name: ssl.name!, requestParameter: JSON.stringify(ssl), type: "poi", longitude: ssl.longitude!, latitude: ssl.latitude!}
    } else {
        return {name: ssl.address!, requestParameter: JSON.stringify(ssl), type: "address", longitude: ssl.longitude!, latitude: ssl.latitude!}
    }
}

function setSearchIcons(id: number, type: SearchObject["type"] | undefined) {
    let inputContainer: Element
    switch (id) {
        case 0:
            inputContainer = document.getElementsByClassName("search__icon--from")[0]
            break
        case 4:
            inputContainer = document.getElementsByClassName("search__icon--to")[0]
            break
        default:
            inputContainer = document.getElementsByClassName("search__icon--via")[id - 1]
    }
    const iconContainer = inputContainer.querySelector(".mini-icon-container")!
    const regex = /^mini-icon-container--/
    const iconClass = Array.from(iconContainer.classList).find(className => regex.test(className))!

    if (iconClass !== "mini-icon-container--" + type) {
        iconContainer.classList.add("mini-icon-container--" + type)
        iconContainer.classList.remove(iconClass)
    }
}
