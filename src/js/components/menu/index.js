import gsap from 'gsap';

class ShapeOverlays {
  constructor(elm, theme) {
    this.elm = elm;
    this.path = elm.querySelectorAll('path');
    this.numPoints = 4;
    this.duration = 3000;
    this.delayPointsArray = [];
    this.delayPointsMax = 0;
    this.delayPerPath = 60;
    this.timeStart = Date.now();
    this.isOpened = false;
    this.isAnimating = false;

    this.theme = theme;
  }
  toggle() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.isOpened ? this.close() : this.open();
  }
  open() {
    this.isOpened = true;
    this.elm.classList.add('is-opened');
    this.timeStart = Date.now();
    this.renderLoop();
  }
  close() {
    this.isOpened = false;
    this.elm.classList.remove('is-opened');
    this.timeStart = Date.now();
    this.renderLoop();

    if (!this.theme) {
      this.hideMenu();
    }
  }
  updatePath(time) {
    const ease = {
      exponentialInOut: (t) =>
        t == 0.0 || t == 1.0 ? t : t < 0.5 ? 0.5 * Math.pow(2.0, 20.0 * t - 10.0) : -0.5 * Math.pow(2.0, 10.0 - t * 20.0) + 1.0,
      sineOut: (t) => Math.sin(t * (Math.PI / 2)),
    };

    const points = [];
    for (let i = 0; i < this.numPoints; i++) {
      if (this.delayPointsArray[i] === undefined) {
        this.delayPointsArray[i] = Math.random() * this.delayPointsMax;
      }

      const thisEase = i % 2 === 1 ? ease.sineOut : ease.exponentialInOut;
      const progress = Math.min(Math.max((time - this.delayPointsArray[i]) / this.duration, 0), 1);

      if(this.theme) {
        points[i] = ((1 - thisEase(progress)) * 100) / 100;
      } else  {
        points[i] = (1 - thisEase(progress)) * 100;
      }
    }

    let str = this.isOpened ? `M 0 0 V ${points[0]}` : `M 0 ${points[0]}`;
    for (let i = 0; i < this.numPoints - 1; i++) {
      if(this.theme) {
        const p = ((i + 1) / (this.numPoints - 1));
        const cp = p - 1 / (this.numPoints - 1) / 2; 

        str += `C ${cp} ${points[i]} ${cp} ${points[i + 1]} ${p} ${points[i + 1]} `;
      } else  {

        const p = ((i + 1) / (this.numPoints - 1)) * 100;
        const cp = p - 100 / (this.numPoints - 1) / 2;

        str += `C ${cp} ${points[i]} ${cp} ${points[i + 1]} ${p} ${points[i + 1]} `;
      }
    }

    if (this.theme) {
      str += this.isOpened ? `V 1 H 0` : `V 0 H 0`;
    } else {
      str += this.isOpened ? `V 100 H 0` : `V 0 H 0`;
    }

    return str.includes('NaN') ? '' : str;
  }
  render() {
    this.path.forEach((p, i) => {
      p.setAttribute(
        'd',
        this.updatePath(Date.now() - (this.timeStart + this.delayPerPath * (this.isOpened ? i : this.path.length - i - 1)))
      );
    });
  }
  renderLoop() {
    this.render();
    if (Date.now() - this.timeStart < this.duration + this.delayPerPath * (this.path.length - 1) + this.delayPointsMax) {
      requestAnimationFrame(() => this.renderLoop());
    } else {
      this.isAnimating = false;

      if (!this.theme && this.isOpened) {
        this.showMenu();
      }
    }
  }
  showMenu() {
    const menu = document.querySelector('[data-menu]');
    if (!menu) return;

    const items = menu.querySelectorAll('[data-menu-item]');
    if (!items.length) return;

    const tl = gsap.timeline({ puased: true });
    tl.fromTo(menu, { opacity: 0, pointerEvents: 'none' }, { opacity: 1, pointerEvents: 'auto', duration: 0.5 }).fromTo(
      items,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.05 }
    );

    tl.play();
  }
  hideMenu() {
    const menu = document.querySelector('[data-menu]');
    if (!menu) return;

    const tl = gsap.timeline({ puased: true });
    tl.fromTo(menu, { opacity: 1, pointerEvents: 'auto' }, { opacity: 0, pointerEvents: 'none', duration: 0.5 });

    tl.play();
  }
}

export default {
  init() {
    const menu = document.querySelector('[data-menu]');
    if (!menu) return;

    const menuToggle = document.querySelector('[data-menu-toggle]');
    if (!menuToggle) return;

    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (!themeToggle) return;

    const svgMenu = document.querySelector('[data-svg-menu]');
    if (!svgMenu) return;

    const svgTheme = document.querySelector('[data-svg-theme]');
    if (!svgTheme) return;

    const svgMenuInstance = new ShapeOverlays(svgMenu);
    const svgThemeInstance = new ShapeOverlays(svgTheme, true);

    menuToggle.addEventListener('click', () => {
      svgMenuInstance.toggle();
    });

    themeToggle.addEventListener('click', () => {
      svgThemeInstance.toggle();
    });
  },
};
