self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('tagada-cache').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/options.html',
                '/popup.js',
                '/options.js',
                '/icons/icon128.png',
                '/icons/icon16.png',
                '/icons/icon32.png',
                '/icons/icon48.png',
                'https://fonts.googleapis.com/icon?family=Material+Icons'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});