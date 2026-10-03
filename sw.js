const CACHE_NAME = 'so-chu-nhiem-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME && key.startsWith('so-chu-nhiem-pwa-'))
          .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Không can thiệp các yêu cầu ghi dữ liệu/API (POST, PUT...) để tránh ảnh hưởng đồng bộ Supabase.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Để các tài nguyên/API khác miền (CDN, Supabase...) hoạt động theo cơ chế gốc của ứng dụng.
  if (url.origin !== self.location.origin) return;

  // Điều hướng: ưu tiên mạng để luôn nhận bản mới; mất mạng thì mở bản đã cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // File tĩnh cùng miền: dùng cache trước, sau đó lấy mạng và cập nhật cache.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
