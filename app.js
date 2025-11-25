// app.js
// Client-side DOCX -> HTML (Mammoth) -> Markdown (Turndown)
// Images embedded as data URIs via Mammoth inline image handler

const fileInput = document.getElementById('file');
const convertBtn = document.getElementById('convert');
const downloadBtn = document.getElementById('download');
const copyBtn = document.getElementById('copy');
const clearBtn = document.getElementById('clear');
const mdArea = document.getElementById('md');

let lastMarkdown = '';

// Convert Blob to data URL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

// Use Mammoth to convert DOCX ArrayBuffer to HTML with images as data URIs
async function docxArrayBufferToHtml(arrayBuffer) {
  const options = {
    convertImage: mammoth.images.inline(async function(element) {
      // element.read() returns a promise resolving to an ArrayBuffer
      const buffer = await element.read();
      const blob = new Blob([buffer], { type: element.contentType });
      const dataUrl = await blobToDataURL(blob);
      return { src: dataUrl };
    })
  };
  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  return result.value; // HTML string
}

// Convert HTML to Markdown using Turndown with some helpful rules
function htmlToMarkdown(html) {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  // Preserve GitHub style tables
  turndownService.addRule('gfmTable', {
    filter: function (node) { return node.nodeName === 'TABLE'; },
    replacement: function (content) { return '\n\n' + content + '\n\n'; }
  });

  // Keep pre/code blocks intact
  turndownService.addRule('preservePre', {
    filter: function (node) { return node.nodeName === 'PRE'; },
    replacement: function (content, node) {
      const code = node.textContent || content;
      return '\n\n```\n' + code + '\n```\n\n';
    }
  });

  return turndownService.turndown(html);
}

// UI helpers
function setBusy(isBusy) {
  convertBtn.disabled = isBusy;
  downloadBtn.disabled = isBusy || !lastMarkdown;
  copyBtn.disabled = isBusy || !lastMarkdown;
}

function showMessage(text) {
  mdArea.value = text;
}

// Main convert handler
convertBtn.addEventListener('click', async () => {
  if (!fileInput.files || !fileInput.files.length) {
    showMessage('Please select a .docx file to convert.');
    return;
  }

  setBusy(true);
  showMessage('Converting… please wait.');

  try {
    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const html = await docxArrayBufferToHtml(arrayBuffer);
    const md = htmlToMarkdown(html);

    lastMarkdown = md;
    mdArea.value = md;
    downloadBtn.disabled = false;
    copyBtn.disabled = false;
  } catch (err) {
    console.error(err);
    showMessage('Conversion error: ' + (err && err.message ? err.message : String(err)));
    lastMarkdown = '';
    downloadBtn.disabled = true;
    copyBtn.disabled = true;
  } finally {
    setBusy(false);
  }
});

// Download .md file
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
});

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastMarkdown || mdArea.value || '');
    // lightweight feedback
    const prev = copyBtn.textContent;
    copyBtn.textContent = 'Copied';
    setTimeout(() => copyBtn.textContent = prev, 1200);
  } catch (e) {
    alert('Copy failed: ' + (e && e.message ? e.message : e));
  }
});

// Clear UI
clearBtn.addEventListener('click', () => {
  fileInput.value = '';
  mdArea.value = '';
  lastMarkdown = '';
  downloadBtn.disabled = true;
  copyBtn.disabled = true;
});
      
