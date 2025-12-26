export function renderPlaceholder(selector, title, tag = '') {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;
  el.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.width = '100%';
  wrap.style.height = '100%';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.justifyContent = 'center';
  wrap.style.flexDirection = 'column';
  wrap.style.background = 'linear-gradient(135deg, rgba(92,124,250,0.08), rgba(116,192,252,0.06))';
  wrap.style.border = '1px dashed #d8ddf0';
  wrap.style.borderRadius = '12px';
  wrap.style.color = '#6f7391';
  wrap.style.fontSize = '14px';
  wrap.style.textAlign = 'center';
  wrap.innerHTML = `<div style="font-weight:700;color:#5c7cfa;margin-bottom:6px;">${tag}</div><div>${title}</div><div style="margin-top:6px;font-size:12px;">(即将实现)</div>`;
  el.appendChild(wrap);
}
