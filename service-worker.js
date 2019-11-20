importScripts("./precache-manifest.eaf5fec9f4e9f4bfe596815ecd92c0b8.js", "./workbox-v3.6.3/workbox-sw.js");
workbox.setConfig({modulePathPrefix: "./workbox-v3.6.3"});
/*
 * @Author: MrFly
 * @Date: 2019-10-18 10:13:36
 * @Description: server worker
 */
const pageCacheName = 'PAGE_CACHE';
const apiCacheName = 'API_CACHE';
const staticCacheName = 'STATIC_CACHE';

const cacheFileList = ['/index.html'];

function matchStatic(url) {
  return /((umi\.(\w|\d)*\.(css|js|map|json)$)|(\/static\/))/.test(url);
}
function matchPage(url) {
  return (/(\.(png|jpg|css|js|json|html|ico|gif|svg))$/i.test(url) && url.includes(self.location.origin)) || url === `${self.location.origin}/` || url.includes(`${self.location.origin}/#/`) || url === self.location.href;
}

function matchApi(url) {
  return url !== self.location.href && url.includes(self.location.origin) && !url.includes('force=1');
}

self.addEventListener('install', e => {
  console.log('Service Worker 状态： install');
  const cacheOpenPromise = caches.open(pageCacheName).then((cache) => {
    return cache.addAll(cacheFileList);
  }).then(() => self.skipWaiting());
  e.waitUntil(cacheOpenPromise);
})

self.addEventListener('fetch', (e) => {
  const currentUrl = e.request.url;
  // 匹配上页面路径
  if (matchStatic(currentUrl)) {
    const requestToCache = e.request.clone();
    e.respondWith(
      // 加载网络上的资源
      fetch(requestToCache).then((response) => {
        // 加载失败
        if (!response || response.status !== 200) {
          throw Error('response error');
        }
        // 加载成功，更新缓存
        const responseToCache = response.clone();
        caches.open(staticCacheName).then((cache) => {
          cache.put(requestToCache, responseToCache);
        });
        return response;
      }).catch(function() {
        // 获取对应缓存中的数据，获取不到则退化到获取默认首页
        return caches.match(e.request).then((response) => {
          return response || caches.match('/index.html');
        });
      })
    );
  } else if (matchPage(currentUrl)) {
    const requestToCache = e.request.clone();
    e.respondWith(
      // 加载网络上的资源
      fetch(requestToCache).then((response) => {
        // 加载失败
        if (!response || response.status !== 200) {
          throw Error('response error');
        }
        // 加载成功，更新缓存
        const responseToCache = response.clone();
        caches.open(pageCacheName).then((cache) => {
          cache.put(requestToCache, responseToCache);
        });
        return response;
      }).catch(function() {
        // 获取对应缓存中的数据，获取不到则退化到获取默认首页
        return caches.match(e.request).then((response) => {
          return response || caches.match('/index.html');
        });
      })
    );
  } else if (matchApi(currentUrl)) {
    const requestToCache = e.request.clone();
    e.respondWith(
      fetch(requestToCache).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(apiCacheName).then((cache) => {
          cache.put(requestToCache, responseToCache);
        });
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
  }
});

self.addEventListener('activate', (e) => {
  const cachePromise = caches.keys().then((keys) => {
    return Promise.all(keys.map((key) => {
      if (key !== pageCacheName && key !== apiCacheName) {
        return caches.delete(key);
      }
      return null;
    }));
  });
  e.waitUntil(cachePromise);
  // 快速激活 sw，使其能够响应 fetch 事件
  return self.clients.claim();
})
