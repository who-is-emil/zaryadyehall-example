import '@/scss/main.scss';

const context = require.context('@/include', true, /\.scss$/);
context.keys().forEach((file) => context(file));

window.$ = window.jQuery = require('jquery');

import './libs';
import './utils/scroll';
import './utils/userAgent';

document.addEventListener('DOMContentLoaded', () => {});

window.addEventListener('reinit', () => {});
