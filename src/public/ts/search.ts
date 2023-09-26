import {setHTMLOfChildOfParent} from "./util.js";
import {Station} from "hafas-client";
/*import {createClient} from "hafas-client"
import {profile as dbProfile} from "hafas-client/p/db/index.js"

const client = createClient(dbProfile, "github.com/dabund24/Zug")*/
let selectedSuggestion = 0
let suggestions: string[] = []

export function setupSearch() {
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
        console.log("\"\"");
        (<HTMLElement>document.getElementsByClassName("search__icon--clear").item(inputIndex)).style.setProperty("display", "none")
        document.getElementsByClassName("search__suggestions").item(inputIndex)!.replaceChildren();
        suggestions = []
        displaySearchSuggestions(inputIndex);
        return;
    }
    (<HTMLElement>document.getElementsByClassName("search__icon--clear").item(inputIndex)).style.setProperty("display", "flex")
    const stations: Station[] = await fetch("/api/stations?name=" + text).then(res => res.json())// client.locations(text, {results: 10, poi: false, addresses: false});
    suggestions = stations.map(station => <string>station.name);
    displaySearchSuggestions(inputIndex);
}

export function displaySearchSuggestions(inputIndex: number) {
    const suggestionsTarget = <HTMLElement>document.getElementsByClassName("search__suggestions").item(inputIndex)!
    suggestionsTarget.replaceChildren()
    const template = (<HTMLTemplateElement>document.getElementById("suggestion-template")).content
    let toBeAdded
    for (let suggestion of suggestions) {
        toBeAdded = document.importNode(template, true)
        setHTMLOfChildOfParent(toBeAdded, ".option__text", suggestion)
        toBeAdded.querySelector(".search__suggestion__click")!.setAttribute("value", suggestion);
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

export function clickSuggestion(suggestion: string, inputIndex: number) {
    const input = (<HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName("search__input")).item(inputIndex)!
    input.value = suggestion;
    if (suggestion === "") {
        input.focus()
        return
    }
    refreshAutocomplete(suggestion, inputIndex);
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
