/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-43e44e5a'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "zoho-domain-verification_8faa2c8b.html",
    "revision": "5bad624e1298b05d45d738b63181dd90"
  }, {
    "url": "zoho-domain-verification.html",
    "revision": "5bad624e1298b05d45d738b63181dd90"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "9832900414f1f502e0fdf466a2fa575f"
  }, {
    "url": "pwa-512x512.png",
    "revision": "840d9ea4480bb01305d54a46f079fba9"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f07fb4f509c4a1fa75d82654f21cf656"
  }, {
    "url": "index.html",
    "revision": "4374c76b9cfd920c96eecdcd07d257db"
  }, {
    "url": "icon.svg",
    "revision": "10e370eaaf9470c7c444feccdd2c9c30"
  }, {
    "url": "favicon.png",
    "revision": "a0e187b512297d86b15ec361e2fe7efc"
  }, {
    "url": "favicon.ico",
    "revision": "a0e187b512297d86b15ec361e2fe7efc"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "afdcf574cbe11c167d4d102a36907073"
  }, {
    "url": "assets/purify.es-Dqk5qvad.js",
    "revision": null
  }, {
    "url": "assets/index.es-g8TGw5fo.js",
    "revision": null
  }, {
    "url": "assets/index-rKtHY3tx.css",
    "revision": null
  }, {
    "url": "assets/index-NhEuKTug.js",
    "revision": null
  }, {
    "url": "assets/html2canvas-Dfqp-MWh.js",
    "revision": null
  }, {
    "url": "assets/investment/tokenized-city.svg",
    "revision": null
  }, {
    "url": "assets/investment/spv-ownership.svg",
    "revision": null
  }, {
    "url": "assets/investment/property-diligence.svg",
    "revision": null
  }, {
    "url": "assets/investment/oracle-data-flow.svg",
    "revision": null
  }, {
    "url": "assets/aistudio/zoho-domain-verification_8faa2c8b.html",
    "revision": null
  }, {
    "url": "assets/aistudio/Kretz_admin___restructured_2_921044d2.html",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7684_7f67ed2c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7683_e4036e07.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7431_1c83094f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7430_de986823.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7394_9338d560.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7262_d382cdc5.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7261_969255ed.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7260_6c58e508.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7258_7d96473e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7257_cce82183.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7256_17797aaa.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7254_637199d6.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7229_3a339366.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_7163_8f4b2c74.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "afdcf574cbe11c167d4d102a36907073"
  }, {
    "url": "favicon.png",
    "revision": "a0e187b512297d86b15ec361e2fe7efc"
  }, {
    "url": "icon.svg",
    "revision": "10e370eaaf9470c7c444feccdd2c9c30"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f07fb4f509c4a1fa75d82654f21cf656"
  }, {
    "url": "pwa-512x512.png",
    "revision": "840d9ea4480bb01305d54a46f079fba9"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "9832900414f1f502e0fdf466a2fa575f"
  }, {
    "url": "manifest.webmanifest",
    "revision": "43bc61593e718d8827ed665df61bed8e"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api/, /^\/auth/]
  }));
  workbox.registerRoute(/\/api\/.*/i, new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
