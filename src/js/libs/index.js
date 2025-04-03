import Lazyload from './lazyload';

document.addEventListener('DOMContentLoaded', () => {
  Lazyload.init();
});

window.addEventListener('reinit', () => {
  Lazyload.init();
});

window.addEventListener('init.lazyload', () => {
  Lazyload.init();
});
