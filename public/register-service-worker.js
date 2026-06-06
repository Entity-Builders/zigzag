(function registerZigzagServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  var localHosts = ['localhost', '127.0.0.1', '::1'];
  if (localHosts.indexOf(window.location.hostname) !== -1) return;

  window.addEventListener('load', function onLoad() {
    navigator.serviceWorker.register('/sw.js').catch(function onError(error) {
      console.warn('[Zigzag] Service worker registration skipped.', error);
    });
  });
})();
