export function registerPwa() {
  if (!import.meta.env?.PROD || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register(new URL('./sw.js', document.baseURI), { scope: './' })
      .catch((error) => console.warn('Offline support unavailable:', error));
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
