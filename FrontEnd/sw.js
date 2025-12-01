// sw.js
// Un Service Worker vacío es suficiente para engañar al navegador
// y hacerle creer que es una app instalable.
self.addEventListener('install', (e) => {
    console.log('Service Worker: Instalado');
});

self.addEventListener('fetch', (e) => {
    // Esto es necesario para que cumpla el requisito de PWA básica
});