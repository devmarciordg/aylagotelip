/**
 * Meta Pixel e GA4 sem custo de LCP.
 *
 * Os IDs chegam no HTML em tempo de build (`<script id="pixels">`), não por
 * requisição: o site é estático e uma chamada de rede no carregamento atrasaria
 * a primeira pintura. O script do provedor só é buscado 3 s depois do load ou na
 * primeira interação — o que vier antes.
 */
const DELAY_MS = 3000;

const LOADERS = {
  meta(id) {
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  },

  ga4(id) {
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(tag);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id);
  },
};

export function initPixels() {
  const node = document.getElementById('pixels');
  if (!node) return;

  let pixels;
  try {
    pixels = JSON.parse(node.textContent);
  } catch {
    return;
  }
  if (!Array.isArray(pixels) || pixels.length === 0) return;

  let done = false;
  const load = () => {
    if (done) return;
    done = true;
    for (const { provider, pixel_id: id } of pixels) {
      if (LOADERS[provider] && id) LOADERS[provider](id);
    }
  };

  const timer = setTimeout(load, DELAY_MS);
  const onFirstInteraction = () => {
    clearTimeout(timer);
    load();
  };
  for (const evt of ['scroll', 'pointerdown', 'keydown']) {
    addEventListener(evt, onFirstInteraction, { once: true, passive: true });
  }
}
