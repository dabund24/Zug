import express from "express";
import compression from "compression";
import path from "path";
import {fileURLToPath} from 'url';
import {createClient, JourneysOptions, LocationsOptions} from "hafas-client"
import {profile as dbProfile} from "hafas-client/p/db/index.js"

import {getJourneys} from "./api/journeys.js"

const app = express();
app.use(compression())
app.use((req, res, next) => {
    if (req.url.endsWith('.br')) {
        res.set('Content-Encoding', 'br');
        res.set('Content-Type', 'application/javascript; charset=UTF-8');
    }
    next();
}, express.static("dist/public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 8081;

const userAgent = "github.com/dabund24/Zug"

const client = createClient(dbProfile, userAgent)

app.get(["/", "/settings", "/about", "/journey", "/journey/map"], (req, res) => {
    res.sendFile(path.join(__dirname, '/public/html/index.html'));
})

app.get("/api/journeys", (req, res) => {
    const from = JSON.parse(<string> req.query.from);
    const vias: string[] = JSON.parse(<string> req.query.vias).map((via: string) => JSON.parse(via));
    const to = JSON.parse(<string> req.query.to);
    const options: JourneysOptions = JSON.parse(<string> req.query.options)

    let stops: string[] = [];
    stops.push(from)
    stops = stops.concat(vias)
    stops.push(to)

    if (req.query.time !== undefined) {
        options.departure = new Date(<string>req.query.time)
    }


    if (req.query.isArrival === "1") {
        delete options.departure
        if (req.query.time !== undefined) {
            options.arrival = new Date(<string>req.query.time)
        } else {
            options.arrival = new Date(Date.now())
        }
    } else if (req.query.isArrival === "0") {
        if (req.query.time !== undefined) {
            options.departure = new Date(<string>req.query.time)
        }
    }

    getJourneys(stops, options, client).then(journeys => {
        res.send(journeys)
    })
})

app.get("/api/stations", (req, res) => {
    const options: LocationsOptions = JSON.parse(<string> req.query.options)
    options.results = 10
    client.locations(<string> req.query.name, options).catch(() => {
        return []
    }).then(stations => res.send(stations))
})

app.get("/api/refresh", (req, res) => {
    client.refreshJourney?.(<string> req.query.token, {stopovers: true, language: <string>req.query.lang, polylines: true})
        .catch(() => null)
        .then(refreshed => res.send([refreshed]))
})

app.listen(port)
console.log("http://localhost:" + port)