import {Product} from "./types.js";

export function getLinePopupHTML(product: Product | undefined, name: string | undefined, direction: string | undefined) {

    return "<div class='flex-row'>" +
        "            <div class='popup__icon popup__icon--small connection-line--" + product + " flex-column'>" +
        "                <div class='connection-line line--vertical'></div>" +
        "                <div class='popup__icon__middle'>" +
        "                    <svg width='12px' height='12px' xmlns='http://www.w3.org/2000/svg'>" +
        "                        <circle cx='6' cy='6' r='6' fill='var(--background-color)'/>" +
        "                        <circle cx='6' cy='6' r='3' fill='var(--product-color)'/>" +
        "                    </svg>" +
        "                </div>" +
        "            </div>" +
        "            <div class='popup__text'>" +  name + " &rightarrow; " + direction + "</div>\n" +
        "        </div>"
}