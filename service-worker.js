const CACHE_NAME = 'efpfinder-cache-v1';

// 监听 install 事件并缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('/asset-manifest.json') // 读取 React 资源清单
      .then(response => response.json())
      .then((assets) => {
        const urlsToCache = new Set([
          '/',
          '/index.html',
          '/manifest.json',
          '/favicon.ico',
          '/pwalogo.png',
          ...Object.values(assets.files) // 可能包含重复的 index.html
        ]);

        return caches.open(CACHE_NAME).then((cache) => cache.addAll([...urlsToCache]));
      })
  );
});

// 监听 fetch 事件，优先使用缓存
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // 过滤掉 Chrome 扩展和非 GET 请求
  if (requestUrl.startsWith('chrome-extension://') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => caches.match('/404.html')) // 断网时返回 404
  );
});

// 监听 activate 事件，清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 监听 message 事件，通知前端 Service Worker 发生更新
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});