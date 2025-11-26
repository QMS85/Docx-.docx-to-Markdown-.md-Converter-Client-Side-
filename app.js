// app.js
// DOCX -> HTML (Mammoth) -> Markdown (Turndown)
// Includes: drag & drop, toasts, progress bar, persistent status, copy & download

/* Elements */
const fileInput = document.getElementById('file');
const dropZone = document.getElementById('drop-zone');
const convertBtn = document.getElementById('convert');
const downloadBtn = document.getElementById('download');
const copyBtn = document.getElementById('copy');
const clearBtn = document.getElementById('clear');
const mdArea = document.getElementById('md');
const toastContainer = document.getElementById('toast-container');

const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const persistentStatus = document.getElementById('persistent-status');

let lastMarkdown = '';
let progressTimer = null;

/* ---------- Utilities ---------- */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/* Toast helper */
function showToast(message, options = {}) {
  if (!toastContainer) return;
  const { type = 'info', duration = 3500 } = options;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const msg = document.createElement('div');
  msg.className = 'msg';
  msg.textContent = message;

  const close = document.createElement('button');
  close.className = 'close';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.innerHTML = '✕';
  close.addEventListener('click', () => removeToast(toast));

  toast.appendChild(msg);
  toast.appendChild(close);
  toastContainer.hidden = false;
  toastContainer.appendChild(toast);

  const timeoutId = setTimeout(() => removeToast(toast), duration);

  function removeToast(el) {
    if (!el) return;
    clearTimeout(timeoutId);
    el.style.transition = 'opacity .12s ease, transform .12s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px) scale(.995)';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (!toastContainer.children.length) toastContainer.hidden = true;
    }, 140);
  }

  return toast;
}

/* Progress helpers */
function setProgress(percent, label) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  if (progressBar) progressBar.style.width = p + '%';
  if (progressLabel) progressLabel.textContent = label || (p === 100 ? 'Complete' : `Progress ${p}%`);
  const parent = progressBar && progressBar.parentElement;
  if (parent) parent.setAttribute('aria-valuenow', String(p));
}

function animateProgressDuringConversion() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  setProgress(6, 'Starting conversion');
  let current = 6;
  progressTimer = setInterval(() => {
    const step = Math.random() * 4 + 1;
    current = Math.min(80, current + step);
    setProgress(current, 'Converting…');
    if (current >= 80) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }, 420);

  return {
    stop(success = true) {
      if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
      setProgress(100, success ? 'Conversion complete' : 'Conversion failed');
      setTimeout(() => setProgress(0, 'Idle'), 1200);
    }
  };
}

/* Persistent status */
function setPersistentStatus(text) {
  if (!persistentStatus) return;
  persistentStatus.innerHTML = `<strong>Status</strong>: ${text}`;
}

/* Busy state */
function setBusy(isBusy) {
  convertBtn.disabled = isBusy;
  downloadBtn.disabled = isBusy || !lastMarkdown;
  copyBtn.disabled = isBusy || !lastMarkdown;
}

/* ---------- Conversion pipeline ---------- */
async function docxArrayBufferToHtml(arrayBuffer) {
  const options = {
    convertImage: mammoth.images.inline(async function(element) {
      const buffer = await element.read();
      const blob = new Blob([buffer], { type: element.contentType });
      const dataUrl = await blobToDataURL(blob);
      return { src: dataUrl };
    })
  };
  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  return result.value;
}

function htmlToMarkdown(html) {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  turndownService.addRule('gfmTable', {
    filter: function (node) { return node.nodeName === 'TABLE'; },
    replacement: function (content) { return '\n\n' + content + '\n\n'; }
  });

  turndownService.addRule('preservePre', {
    filter: function (node) { return node.nodeName === 'PRE'; },
    replacement: function (content, node) {
      const code = node.textContent || content;
      return '\n\n```\n' + code + '\n```\n\n';
    }
  });

  return turndownService.turndown(html);
}

/* ---------- UI interactions ---------- */

/* Drag & drop */
;(() => {
  const zone = dropZone;
  if (!zone) return;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
})();

/* File selected */
fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files.length) {
    const f = fileInput.files[0];
    showToast(`Selected file: ${f.name}`, { type: 'success', duration: 3000 });
    setPersistentStatus(`File selected: ${f.name}`);
    setProgress(0, 'Ready to convert');
  } else {
    setPersistentStatus('No file selected');
  }
});

/* Convert */
convertBtn.addEventListener('click', async () => {
  if (!fileInput.files || !fileInput.files.length) {
    showToast('No file selected. Please choose a .docx file.', { type: 'warn' });
    setPersistentStatus('Awaiting file');
    return;
  }

  setBusy(true);
  showToast('Conversion started', { type: 'info', duration: 1600 });
  showMessage('Converting… please wait.');
  setPersistentStatus('Conversion started');

  const progressController = animateProgressDuringConversion();

  try {
    const file = fileInput.files[0];
    setProgress(12, 'Reading file');
    const arrayBuffer = await file.arrayBuffer();

    setProgress(28, 'Parsing document');
    const html = await docxArrayBufferToHtml(arrayBuffer);

    setProgress(62, 'Generating Markdown');
    const md = htmlToMarkdown(html);

    lastMarkdown = md;
    mdArea.value = md;
    downloadBtn.disabled = false;
    copyBtn.disabled = false;

    progressController.stop(true);
    setPersistentStatus('Conversion complete');
    showToast('Conversion complete — .docx → Markdown', { type: 'success', duration: 3500 });
  } catch (err) {
    console.error(err);
    mdArea.value = 'Conversion error: ' + (err && err.message ? err.message : String(err));
    lastMarkdown = '';
    downloadBtn.disabled = true;
    copyBtn.disabled = true;

    progressController.stop(false);
    setPersistentStatus('Conversion failed');
    showToast('Conversion failed. See console for details.', { type: 'warn', duration: 5000 });
  } finally {
    setBusy(false);
  }
});

/* Download */
downloadBtn.addEventListener('click', () => {
  const content = lastMarkdown || mdArea.value || '';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.md';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showToast('Download started — document.md', { type: 'info', duration: 3000 });
  setPersistentStatus('Download started');

  setTimeout(() => {
    setPersistentStatus('Download complete');
    showToast('Download complete', { type: 'success', duration: 2200 });
    setTimeout(() => setPersistentStatus('Ready'), 1200);
  }, 900);
});

/* Copy */
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastMarkdown || mdArea.value || '');
    showToast('Markdown copied to clipboard', { type: 'success', duration: 2200 });
    setPersistentStatus('Copied to clipboard');
    const prev = copyBtn.textContent;
    copyBtn.textContent = 'Copied';
    setTimeout(() => copyBtn.textContent = prev, 1200);
    setTimeout(() => setPersistentStatus('Ready'), 1200);
  } catch (e) {
    showToast('Copy failed', { type: 'warn', duration: 3000 });
    setPersistentStatus('Copy failed');
  }
});

/* Clear */
clearBtn.addEventListener('click', () => {
  fileInput.value = '';
  mdArea.value = '';
  lastMarkdown = '';
  downloadBtn.disabled = true;
  copyBtn.disabled = true;
  setPersistentStatus('Ready');
  setProgress(0, 'Idle');
  showToast('Cleared', { type: 'info', duration: 1200 });
});

/* Small helper to show message in textarea when needed */
function showMessage(text) {
  mdArea.value = text;
}

/* Initialize */
(function init() {
  setProgress(0, 'Idle');
  setPersistentStatus('Ready');
  setBusy(false);
})();
