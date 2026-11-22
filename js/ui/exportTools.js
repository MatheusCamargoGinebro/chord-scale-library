/**
 * Export & Sharing Utilities
 * - High-DPI PNG Export from any SVG diagram/fretboard
 * - Formatted Vector PDF Print Export
 * - URL Hash State Sharing with Clipboard copy
 */

export const ExportTools = {
  /**
   * Renders an SVG element onto a high-DPI Canvas with header branding and downloads a PNG.
   */
  exportSvgAsPng(svgEl, filename = 'chord-scale-library.png', title = 'Chord & Scale Library') {
    if (!svgEl) return false;
    const clone = svgEl.cloneNode(true);
    const vb = svgEl.viewBox.baseVal;
    const w = vb && vb.width ? vb.width : svgEl.getBoundingClientRect().width || 800;
    const h = vb && vb.height ? vb.height : svgEl.getBoundingClientRect().height || 300;

    // Resolve currentColor for standalone SVG rendering
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const bgColor = isLight ? '#ffffff' : '#0f172a';
    const textColor = isLight ? '#0f172a' : '#f8fafc';

    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.style.color = textColor;

    let xml = new XMLSerializer().serializeToString(clone);
    xml = xml.replaceAll('currentColor', textColor);

    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const pad = 28;
      const headerH = 44;
      const canvas = document.createElement('canvas');
      canvas.width = (w + pad * 2) * scale;
      canvas.height = (h + pad * 2 + headerH) * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Background card
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w + pad * 2, h + pad * 2 + headerH);

      // Header branding
      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 15px Inter, system-ui, sans-serif';
      ctx.fillText(title, pad, 30);
      ctx.fillStyle = '#64748b';
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Chord & Scale Library', w + pad, 30);
      ctx.textAlign = 'left';

      ctx.drawImage(img, pad, headerH + pad / 2, w, h);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
    return true;
  },

  /**
   * Opens a clean print-ready document so the user can Save as PDF with crisp vector diagrams.
   */
  exportPdfSheet(title, subtitle, bodyHtml) {
    const win = window.open('', '_blank', 'width=980,height=760');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} — Chord & Scale Library</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 28px;
      line-height: 1.5;
    }
    header {
      border-bottom: 2px solid #f59e0b;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 { margin: 0; font-size: 24px; color: #0f172a; }
    .sub { color: #475569; font-size: 13px; margin-top: 4px; }
    .brand { font-size: 12px; font-weight: 700; color: #d97706; }
    svg { max-width: 100%; height: auto; color: #0f172a; }
    .print-section { margin-bottom: 22px; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background: #f1f5f9; }
    pre, .tablature-box { font-family: monospace; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; }
    .no-print { margin-bottom: 16px; }
    .btn-print { background: #f59e0b; color: #090d16; border: none; padding: 9px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; }
    @media print { .no-print { display: none; } body { margin: 10mm; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">Salvar como PDF / Imprimir</button>
  </div>
  <header>
    <div>
      <h1>${title}</h1>
      <div class="sub">${subtitle}</div>
    </div>
    <div class="brand">Chord & Scale Library</div>
  </header>
  <main>${bodyHtml}</main>
</body>
</html>`);
    win.document.close();
  },

  /**
   * Encodes app state into a shareable URL and copies to clipboard.
   */
  async shareState(stateObj) {
    const params = new URLSearchParams();
    Object.entries(stateObj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}#${params.toString()}`;
    window.history.replaceState(null, '', `#${params.toString()}`);

    try {
      await navigator.clipboard.writeText(shareUrl);
      return { ok: true, url: shareUrl };
    } catch {
      return { ok: false, url: shareUrl };
    }
  },

  parseShareState() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const out = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return Object.keys(out).length ? out : null;
  },
};
