// Kleine Helfer zum Bauen der Oberfläche
export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    el.append(kind instanceof Node ? kind : String(kind));
  }
  return el;
}

export const knopf = (text, onclick, klasse = 'knopf') => h('button', { class: klasse, type: 'button', onclick }, text);
