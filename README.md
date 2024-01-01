# Zug

A web application assisting users of public transport in Germany on planning longer journeys with transfers.

Users can investigate possible transfers in a detailed way in order to prepare for delays/cancellations in advance and/or incorporate longer stays into their journey. This is achieved by fetching journeys between all selected stopovers from [`Hafas`](https://de.wikipedia.org/wiki/HAFAS) and visualizing how they relate to each other in an interactive diagram.

This app is intended to be some sort of hybrid between [DB Navigator](https://bahn.de) and [Time-Space Train Planner (TSTP)](https://github.com/traines-source/time-space-train-planner).

## Features

This app can...

- find possible sub-journeys between multiple stations, addresses and poi

- visualize temporal relations between these sub-journeys

- merge sub-journeys to a new journey

- show details and live data of journeys

- show journeys on a map

- create links for journeys so they can be shared

## Usage

Prerequisite: `node.js`

To run the application, execute these commands:

```
npm install
```

```
npm run build
```

```
npm start
```

Then, open [`http://localhost:8081`](http://localhost:8081) in your browser.

## Great projects this app relies on

- [hafas-client](https://github.com/public-transport/hafas-client)
- [Leaflet](https://leafletjs.com)
- [OpenStreetMap](https://www.openstreetmap.org)
- [OpenRailwayMap](https://www.openrailwaymap.org)

## Screenshots

![connection search](media/connection_search.png)
![journey details 1](media/details_map_0.png)
![journey details 2](media/details_map_1.png)

## How it works

### 1. Fetch sub-journeys

Assume we want to travel from `A` to `D` and know that on our journey we will have to change in `B` and `C`. Asking DB-Navigator for connections will give us the following "timetables":

*Journeys from `A` to `B`*

|    ID | Departure | Arrival |
|------:|:---------:|:-------:|
| `AB1` |   10.00   |  12.00  |
| `AB2` |   11.00   |  13.30  |
| `AB3` |   12.00   |  14.00  |

*Journeys from `B` to `C`*

|    ID | Departure | Arrival |
|------:|:---------:|:-------:|
| `BC1` |   12.10   |  12.30  |
| `BC2` |   12.40   |  13.00  |
| `BC3` |   13.10   |  13.30  |
| `BC4` |   13.40   |  14.00  |
| `BC5` |   14.10   |  14.30  |
| `BC6` |   14.40   |  15.00  |

*Journeys from `C` to `D`*

|    ID | Departure | Arrival |
|------:|:---------:|:-------:|
| `CD1` |   13.20   |  14.00  |
| `CD2` |   13.40   |  14.30  |
| `CD3` |   13.50   |  14.45  |
| `CD4` |   14.40   |  15.30  |
| `CD5` |   14.50   |  15.45  |

Note that a journey can be a direct connection, but as opposed to TSTP doesn't have to be.

### 2. Arrange journeys in tree

In order to create the diagram we want, we first need to arrange the found journeys in a tree-like structure. Apart from the root, which has no semantic meaning, each level represents a section of the full journey. In our example, level 1 contains all journeys found from `A` to `B`, level 2 all journeys from `B` to `C` and level 3 those from `C` to `D`. We construct our tree with these rules:

- In each level, journeys are sorted by their departure time in ascending order

  *i.e. the further right a journey is in a level, the later it begins*

- The first child of a journey is the journey of the next level with the earliest departure where the departure of the child is still later than the arrival of its parent

  *i.e. the earliest journey one can reach from another journey is its first child*

From the rules above, we can derive this more general rule:

*All children of a journey and all children of all right siblings of a journey are "reachable" from it, but all children of all left siblings are not.*

This results in this tree:

```mermaid
graph TD;
    r((root))-->AB1;
    r-->AB2;
    r-->AB3;
    AB1((AB1))-->BC1((BC1));
    AB1-->BC2((BC2));
    AB1-->BC3((BC3));
    AB2((AB2))-->BC4((BC4));
    AB3((AB3))-->BC5((BC5));
    AB3-->BC6((BC6));

    BC2-->CD1((CD1));
    BC3-->CD2((CD2));
    BC3-->CD3((CD3));
    BC5-->CD4((CD4));
    BC5-->CD5((CD5));
```

### 3. Reflect tree structure in HTML

When given a tree as the one seen above from the server, the frontend displays it such that all parent child relationships from the constructed tree also exist in the DOM, which results in this diagram:

![tree displayed in application](media/tree_showcase.png)

Notice how the first child of each journey can be found directly to the right of that journey, whereas all "unreachable" connections are above it. This is a consequence of the rules we constructed the tree with. So to read this diagram, we can use this simple and intuitive rule: You can only travel rightwards and downwards, but never leftwards or upwards.
