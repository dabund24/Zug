const staticCacheName = "staticCache-v0.1.0"
const assets = [
    "/",
    "/journey",
    "/journey/map",
    "/settings",
    "/about",

    "/html/index.html",

    "/bundle.js.br",
    "/bundle.js.gz",

    "/css/footer.css",
    "/css/journeys.css",
    "/css/main.css",
    "/css/map.css",
    "/css/search.css",
    "/css/station-names.css",
    "/css/subpage-layout.css",
    "/css/tooltips.css",
    
    "/img/favicon.svg"
]

self.addEventListener("install", evt => {
    evt.waitUntil(
        caches.open(staticCacheName).then(cache => {
        cache.addAll(assets)
    }))
})

self.addEventListener("activate", evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== staticCacheName)
                .map(key => caches.delete(key)))
        })
    )
})

self.addEventListener("fetch", evt => {
    evt.respondWith(
        caches.match(evt.request).then(cacheResponse => {
            return cacheResponse || fetch(evt.request)
        })
    )
})