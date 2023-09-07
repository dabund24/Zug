import express from "express";
import path from "path";
import {fileURLToPath} from 'url';
import {createClient, JourneysOptions} from "hafas-client"
import {profile as dbProfile} from "hafas-client/p/db/index.js"

import {getJourneys} from "./api/journeys.js"

const app = express();
app.use(express.static("dist/public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 8081;


const userAgent = "github.com/dabund24/Zug"

const dbProfileWithoutRtModeRealtime = {
    ...dbProfile,
    transformReqBody: (ctx:any, body:any) => {
        // @ts-ignore
        const reqBody = dbProfile.transformReqBody(ctx, body)
        delete reqBody.svcReqL[0].cfg.rtMode
        return reqBody
    }
}

const client = createClient(dbProfile, userAgent)


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '/public/html/index.html'));
})

app.get("/api/journeys", (req, res) => {
    const from = <string>req.query.from;
    const vias: string[] = JSON.parse(<string>req.query.vias);
    const to = <string>req.query.to;

    let stops :string[] = [];
    stops.push(from)
    stops = stops.concat(vias)
    stops.push(to)

    let options: JourneysOptions = {};
    if (req.query.time !== undefined) {
        options.departure = new Date(<string>req.query.time)
    }

    /*
    if (req.query.isArrival === "1") {
        if (req.query.time !== undefined) {
            options.arrival = new Date(<string>req.query.time)
        } else {
            options.arrival = new Date(Date.now())
        }
    } else if (req.query.isArrival === "0") {
        if (req.query.time !== undefined) {
            options.departure = new Date(<string>req.query.time)
        }
    }*/
    console.log(stops)

    getJourneys(stops, options, client).then(journeys => {
        //console.log(journeys[1][1].length + " afterw")
        res.send(journeys)
    })
})

app.get("/api/stations", (req, res) => {

    client.locations(<string>req.query.name, {results: 10, poi: false, addresses: false})
        .then(stations => res.send(stations))

})

app.listen(port)
console.log("http://localhost:" + port)