# parcel-plugin-precache-manifest
A simple Parcel plugin that generates a precache manifest that can be imported by service workers

## Usage

The plugin generates a file similar to the following:
```js
self.__precacheManifest = {
  "files": ["/index.html", "/client.33316f76.js", "/sw.js"],
  "ver": "a2eeefb1213a80f101f9d6f8687f5007"
}
```

The `files` key is a list of files to cache (paths depend on publicURL given to Parcel). `ver` is a hash of the build and will change itself if you ever update your app. It's useful for purging old cache when updating the client from a service worker.

The filename defaults to `precache-manifest.js` and the variable name defaults to `__precacheManifest` (like Workbox-based systems). However, you can customize this in `package.json`.

In `service-worker.js`:

```javascript
importScripts('/myFilename.js'); // path depends on publicUrl param given to Parcel 

self.addEventListener("install", e => {
  // Array containing URLs of everything in the bundle is added to global scope of service worker in precache-manifest.js
  e.waitUntil(caches.open(myVariableName.ver).then(cache => cache.addAll(myVariableName.files)));
});
```

In `package.json`:

```json
{
  "precacheManifest": {
    "filename": "myFilename.js",
    "variableName": "myVariableName"
  }
}
```

If you're want to completely guarantee that you don't use an old version of the manifest when updating your service worker, you can't (yet) use `importScripts`. However, you can set the option `asJSON` to `true` in `package.json` and make a `fetch` call instead. This has the added benefit of not adding an extra variable to the global scope. `asJSON` changes the default filename to `precache-manifest.json`, and the `variableName` parameter becomes ignored.

In `service-worker.js`:

```javascript
self.addEventListener("install", e => {
  e.waitUntil(fetch("/precache-manifest.json", { cache: "no-store" })
    .then(res => res.json())
    .then(manifest => caches.open(manifest.ver).then(cache => cache.addAll(manifest.files)))
  );
});
```

In `package.json`:
```json
{
  "precacheManifest": {
    "asJSON": true
  }
}
```

## License
MIT