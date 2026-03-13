const CANVAS_W = 600;
const CANVAS_H = 450;
const MAX_FRAMES = 50;

const PALETTE_COLORS = [
    '#000000', '#ffffff', '#ff4444', '#ff8800',
    '#ffcc00', '#44cc44', '#00ccff', '#8844ff',
    '#ff44aa', '#7a3b00', '#aaaaaa', '#444444',
    '#00ccaa', '#0055ff', '#ff0077', '#aaff00',
];

const canvas    = document.getElementById('draw-canvas');
const ctx       = canvas.getContext('2d');
const paletteEl = document.getElementById('palette');
const frameStrip = document.getElementById('frame-strip');
const onionToggle = document.getElementById('onion-toggle');
const clearBtn  = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const durationSlider = document.getElementById('duration-slider');
const durationLabel  = document.getElementById('duration-label');
const errorMsg  = document.getElementById('error-msg');
const progress  = document.getElementById('progress');
const resultSection = document.getElementById('result');
const gifPreview    = document.getElementById('gif-preview');
const downloadBtn   = document.getElementById('download-btn');
const drawAnotherBtn = document.getElementById('draw-another-btn');
const customColorInput = document.getElementById('custom-color');

let tool      = 'marker';
let color     = '#000000';
let brushSize = 10;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let onionSkin = false;
let currentBlobUrl = null;
let frames = [];
let currentIdx = 0;

// --- Canvas init ---

canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

const saveCanvas = document.createElement('canvas');
saveCanvas.width  = CANVAS_W;
saveCanvas.height = CANVAS_H;
const saveCtx = saveCanvas.getContext('2d');

function fillWhite() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    saveCtx.fillStyle = '#ffffff';
    saveCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// --- Palette ---

PALETTE_COLORS.forEach(c => {
    const swatch = document.createElement('button');
    swatch.className = 'palette-swatch' + (c === color ? ' palette-swatch--active' : '');
    swatch.style.background = c;
    swatch.title = c;
    swatch.addEventListener('click', () => {
        document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('palette-swatch--active'));
        swatch.classList.add('palette-swatch--active');
        color = c;
        setActiveTool('marker');
    });
    paletteEl.appendChild(swatch);
});

customColorInput.addEventListener('input', () => {
    color = customColorInput.value;
    document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('palette-swatch--active'));
    setActiveTool('marker');
});

function setActiveTool(t) {
    tool = t;
    document.querySelectorAll('.tool-btn').forEach(b => {
        b.classList.toggle('tool-btn--active', b.dataset.tool === t);
    });
}

// --- Frame Management ---

function newBlankFrame() {
    const tmp = document.createElement('canvas');
    tmp.width = CANVAS_W;
    tmp.height = CANVAS_H;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    return tctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
}

function saveCurrentFrame() {
    frames[currentIdx] = saveCtx.getImageData(0, 0, CANVAS_W, CANVAS_H);
}

function loadFrame(idx) {
    saveCtx.fillStyle = '#ffffff';
    saveCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    saveCtx.putImageData(frames[idx], 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(saveCanvas, 0, 0);

    if (onionSkin && idx > 0 && frames[idx - 1]) {
        const tmp = document.createElement('canvas');
        tmp.width = CANVAS_W;
        tmp.height = CANVAS_H;
        tmp.getContext('2d').putImageData(frames[idx - 1], 0, 0);
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(tmp, 0, 0);
        ctx.restore();
    }
}

function addFrame() {
    if (frames.length >= MAX_FRAMES) return;
    saveCurrentFrame();
    frames.push(newBlankFrame());
    currentIdx = frames.length - 1;
    loadFrame(currentIdx);
    renderStrip();
}

function deleteFrame(idx) {
    if (frames.length <= 1) return;
    frames.splice(idx, 1);
    currentIdx = Math.min(currentIdx, frames.length - 1);
    loadFrame(currentIdx);
    renderStrip();
}

function switchFrame(idx) {
    if (idx === currentIdx) return;
    saveCurrentFrame();
    currentIdx = idx;
    loadFrame(currentIdx);
    renderStrip();
}

function renderStrip() {
    frameStrip.innerHTML = '';
    frames.forEach((frameData, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'frame-thumb' + (idx === currentIdx ? ' frame-thumb--active' : '');

        const tc = document.createElement('canvas');
        tc.width = CANVAS_W;
        tc.height = CANVAS_H;
        tc.getContext('2d').putImageData(frameData, 0, 0);
        thumb.appendChild(tc);

        const num = document.createElement('span');
        num.className = 'frame-thumb__num';
        num.textContent = idx + 1;
        thumb.appendChild(num);

        const del = document.createElement('button');
        del.className = 'frame-thumb__del';
        del.innerHTML = '&times;';
        del.addEventListener('click', e => { e.stopPropagation(); deleteFrame(idx); });
        thumb.appendChild(del);

        thumb.addEventListener('click', () => switchFrame(idx));
        frameStrip.appendChild(thumb);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-frame-btn';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add frame';
    addBtn.disabled = frames.length >= MAX_FRAMES;
    addBtn.addEventListener('click', addFrame);
    frameStrip.appendChild(addBtn);
}

// --- Toolbar Handlers ---

document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
});

document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('size-btn--active'));
        btn.classList.add('size-btn--active');
        brushSize = parseInt(btn.dataset.size);
    });
});

onionToggle.addEventListener('change', () => {
    onionSkin = onionToggle.checked;
    loadFrame(currentIdx);
});

clearBtn.addEventListener('click', () => {
    saveCtx.fillStyle = '#ffffff';
    saveCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    loadFrame(currentIdx);
    saveCurrentFrame();
    renderStrip();
});

durationSlider.addEventListener('input', () => {
    durationLabel.textContent = durationSlider.value + 'ms';
});

// --- Init first frame ---

frames.push(newBlankFrame());
loadFrame(0);
renderStrip();

// --- Coordinate Mapping ---

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top)  * scaleY,
    };
}

// --- Drawing ---

function startDraw(e) {
    e.preventDefault();
    isDrawing = true;
    const { x, y } = getPos(e);
    lastX = x;
    lastY = y;
    applyToolStyle();
    [ctx, saveCtx].forEach(c => {
        c.beginPath();
        c.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(x, y);
    });
}

function draw(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    applyToolStyle();
    [ctx, saveCtx].forEach(c => {
        c.beginPath();
        c.moveTo(lastX, lastY);
        c.lineTo(x, y);
        c.stroke();
    });
    lastX = x;
    lastY = y;
}

function endDraw(e) {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();
    saveCurrentFrame();
    renderStrip();
}

function applyToolStyle() {
    const strokeColor = tool === 'eraser' ? '#ffffff' : color;
    [ctx, saveCtx].forEach(c => {
        c.lineCap   = 'round';
        c.lineJoin  = 'round';
        c.lineWidth = brushSize;
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = strokeColor;
        c.fillStyle   = strokeColor;
    });
}

// Mouse events
canvas.addEventListener('mousedown',  startDraw);
canvas.addEventListener('mousemove',  draw);
canvas.addEventListener('mouseup',    endDraw);
canvas.addEventListener('mouseleave', endDraw);

// Touch events
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove',  draw,       { passive: false });
canvas.addEventListener('touchend',   endDraw);

// --- Export ---

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.hidden = false;
}

function hideError() {
    errorMsg.hidden = true;
}

exportBtn.addEventListener('click', async () => {
    hideError();
    saveCurrentFrame();

    if (frames.length < 2) {
        showError('Draw at least 2 frames before exporting.');
        return;
    }

    // Render each frame to a data URL
    const dataUrls = frames.map(frameData => {
        const tmp = document.createElement('canvas');
        tmp.width  = CANVAS_W;
        tmp.height = CANVAS_H;
        tmp.getContext('2d').putImageData(frameData, 0, 0);
        return tmp.toDataURL('image/png');
    });

    exportBtn.disabled = true;
    progress.hidden = false;

    try {
        const res = await fetch('/draw/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frames: dataUrls, duration: parseInt(durationSlider.value) }),
        });

        if (!res.ok) {
            const data = await res.json();
            showError(data.error || 'Export failed.');
            exportBtn.disabled = false;
            progress.hidden = true;
            return;
        }

        const blob = await res.blob();
        showResult(blob);
    } catch (err) {
        showError('Network error. Please try again.');
        exportBtn.disabled = false;
        progress.hidden = true;
    }
});

// --- Result Display ---

function showResult(blob) {
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = URL.createObjectURL(blob);
    gifPreview.src   = currentBlobUrl;
    downloadBtn.href = currentBlobUrl;
    document.querySelector('.draw-layout').hidden = true;
    document.querySelector('.bottom-panel').hidden = true;
    resultSection.hidden = false;
    progress.hidden = true;
}

drawAnotherBtn.addEventListener('click', () => {
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
    frames = [newBlankFrame()];
    currentIdx = 0;
    loadFrame(0);
    renderStrip();
    exportBtn.disabled = false;
    gifPreview.src = '';
    resultSection.hidden = true;
    document.querySelector('.draw-layout').hidden = false;
    document.querySelector('.bottom-panel').hidden = false;
});
