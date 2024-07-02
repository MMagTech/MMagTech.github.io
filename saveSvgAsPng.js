\(function() {
  const out$ = typeof exports != 'undefined' && exports || typeof define != 'undefined' && {} || this || window;
  if (typeof define !== 'undefined') define('save-svg-as-png', [], () => out$);
  out$.default = out$;

  const xmlNs = 'http://www.w3.org/2000/xmlns/';
  const xhtmlNs = 'http://www.w3.org/1999/xhtml';
  const svgNs = 'http://www.w3.org/2000/svg';
  const doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';

  const isElement = obj => obj instanceof HTMLElement || obj instanceof SVGElement;
  const requireDomNode = el => {
    if (!isElement(el)) throw new Error(`An HTMLElement or SVGElement is required; got ${el}`);
  };
  const requireDomNodePromise = el =>
    new Promise((resolve, reject) => {
      if (isElement(el)) resolve(el);
      else reject(new Error(`An HTMLElement or SVGElement is required; got ${el}`));
    });

  const getDimension = (el, clone, dim) => {
    const v =
      (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
      (clone.getAttribute(dim) !== null && !clone.getAttribute(dim).match(/%$/) && parseInt(clone.getAttribute(dim))) ||
      el.getBoundingClientRect()[dim] ||
      parseInt(clone.style[dim]) ||
      parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return typeof v === 'undefined' || v === null || isNaN(parseFloat(v)) ? 0 : v;
  };

  const getDimensions = (el, clone, width, height) => {
    if (el.tagName === 'svg') {
      return {
        width: width || getDimension(el, clone, 'width'),
        height: height || getDimension(el, clone, 'height')
      };
    } else if (el.getBBox) {
      const { x, y, width, height } = el.getBBox();
      return {
        width: x + width,
        height: y + height
      };
    }
  };

  const reEncode = data =>
    decodeURIComponent(
      encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        const c = String.fromCharCode(`0x${p1}`);
        return c === '%' ? '%25' : c;
      })
    );

  const uriToBlob = uri => {
    const byteString = window.atob(uri.split(',')[1]);
    const mimeString = uri.split(',')[0].split(':')[1].split(';')[0];
    const buffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([buffer], { type: mimeString });
  };

  const saveToPhotos = (uri) => {
    const image = new Image();
    image.src = uri;

    image.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);

      canvas.toBlob(blob => {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, 'image.png');
        } else {
          const a = document.createElement('a');
          document.body.appendChild(a);
          a.style.display = 'none';
          a.href = URL.createObjectURL(blob);
          a.download = 'image.png';
          a.click();
          window.URL.revokeObjectURL(a.href);
          document.body.removeChild(a);
        }
      }, 'image/png');
    };
  };

  out$.prepareSvg = (el, options, done) => {
    requireDomNode(el);
    const { left = 0, top = 0, width: w, height: h, scale = 1, responsive = false } = options || {};

    return Promise.resolve().then(() => {
      let clone = el.cloneNode(true);
      clone.style.backgroundColor = (options || {}).backgroundColor || el.style.backgroundColor;
      const { width, height } = getDimensions(el, clone, w, h);

      if (el.tagName !== 'svg') {
        if (el.getBBox) {
          if (clone.getAttribute('transform') != null) {
            clone.setAttribute('transform', clone.getAttribute('transform').replace(/translate\(.*?\)/, ''));
          }
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.appendChild(clone);
          clone = svg;
        } else {
          console.error('Attempted to render non-SVG element', el);
          return;
        }
      }

      clone.setAttribute('version', '1.1');
      clone.setAttribute('viewBox', [left, top, width, height].join(' '));
      if (!clone.getAttribute('xmlns')) clone.setAttributeNS(xmlNs, 'xmlns', svgNs);
      if (!clone.getAttribute('xmlns:xlink')) clone.setAttributeNS(xmlNs, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

      if (responsive) {
        clone.removeAttribute('width');
        clone.removeAttribute('height');
        clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      } else {
        clone.setAttribute('width', width * scale);
        clone.setAttribute('height', height * scale);
      }

      const outer = document.createElement('div');
      outer.appendChild(clone);
      const src = outer.innerHTML.replace(/NS\d+:href/gi, 'xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href');

      if (typeof done === 'function') done(src, width, height);
      else return { src, width, height };
    });
  };

  out$.svgAsDataUri = (el, options, done) => {
    requireDomNode(el);
    return out$.prepareSvg(el, options).then(({ src, width, height }) => {
      const svgXml = `data:image/svg+xml;base64,${window.btoa(reEncode(doctype + src))}`;
      if (typeof done === 'function') {
        done(svgXml, width, height);
      }
      return svgXml;
    });
  };

  out$.svgAsPngUri = (el, options, done) => {
    requireDomNode(el);
    const { encoderType = 'image/png', encoderOptions = 0.8 } = options || {};

    const convertToPng = ({ src, width, height }) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;

      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0);
        let png;
        try {
          png = canvas.toDataURL(encoderType, encoderOptions);
        } catch (e) {
          if ((typeof SecurityError !== 'undefined' && e instanceof SecurityError) || e.name === 'SecurityError') {
            console.error('Rendered SVG images cannot be downloaded in this browser.');
            return;
          } else throw e;
        }
        if (typeof done === 'function') done(png, canvas.width, canvas.height);
        return Promise.resolve(png);
      };
      image.onerror = () => {
        reject(`There was an error loading the data URI as an image on the following SVG\n${window.atob(src.slice(26))}Open the following link to see browser's diagnosis\n${src}`);
      };
      image.src = src;
    };

    return out$.svgAsDataUri(el, options).then(uri => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(convertToPng({ src: uri, width: image.width, height: image.height }));
        image.onerror = () => {
          reject(`There was an error loading the data URI as an image on the following SVG\n${window.atob(uri.slice(26))}Open the following link to see browser's diagnosis\n${uri}`);
        };
        image.src = uri;
      });
    });
  };

  out$.saveSvgAsPng = (el, options) => {
    return requireDomNodePromise(el)
      .then(el => out$.svgAsPngUri(el, options || {}))
      .then(uri => {
        saveToPhotos(uri);
      });
  };
})();
