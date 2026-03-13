const MAX_IMAGES = 8;
const MIN_IMAGES = 2;

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const previewArea = document.getElementById("preview-area");
const previewGrid = document.getElementById("preview-grid");
const frameCount = document.getElementById("frame-count");
const submitBtn = document.getElementById("submit-btn");
const errorMsg = document.getElementById("error-msg");
const progress = document.getElementById("progress");
const form = document.getElementById("upload-form");
const durationSlider = document.getElementById("duration-slider");
const durationInput = document.getElementById("duration-input");
const durationLabel = document.getElementById("duration-label");
const resultSection = document.getElementById("result");
const gifPreview = document.getElementById("gif-preview");
const downloadBtn = document.getElementById("download-btn");
const makeAnotherBtn = document.getElementById("make-another-btn");
let files = []; // ordered list of File objects
let currentBlobUrl = null; // track blob URL for cleanup

// --- Drop Zone Events ---

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drop-zone--active");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drop-zone--active");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drop-zone--active");
    addFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
});

// --- Duration Slider ---

durationSlider.addEventListener("input", () => {
    durationInput.value = durationSlider.value;
    durationLabel.textContent = durationSlider.value + "ms";
});

// --- File Handling ---

function addFiles(newFiles) {
    hideError();
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif"];

    for (const f of newFiles) {
        if (!allowed.includes(f.type)) {
            showError("Unsupported file type: " + f.name);
            return;
        }
        if (files.length >= MAX_IMAGES) {
            showError("Maximum " + MAX_IMAGES + " images allowed.");
            return;
        }
        files.push(f);
    }
    renderPreviews();
}

function removeFile(index) {
    files.splice(index, 1);
    renderPreviews();
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.hidden = false;
}

function hideError() {
    errorMsg.hidden = true;
}

// --- Preview Rendering ---

function renderPreviews() {
    previewGrid.innerHTML = "";
    frameCount.textContent = files.length;
    previewArea.hidden = files.length === 0;
    submitBtn.disabled = files.length < MIN_IMAGES;

    files.forEach((file, idx) => {
        const card = document.createElement("div");
        card.className = "preview-card";
        card.draggable = true;
        card.dataset.index = idx;

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = "Frame " + (idx + 1);
        img.onload = () => URL.revokeObjectURL(img.src);

        const removeBtn = document.createElement("button");
        removeBtn.className = "preview-card__remove";
        removeBtn.innerHTML = "&times;";
        removeBtn.title = "Remove";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFile(idx);
        });

        card.appendChild(img);
        card.appendChild(removeBtn);
        previewGrid.appendChild(card);

        // Drag-to-reorder events
        card.addEventListener("dragstart", onDragStart);
        card.addEventListener("dragover", onDragOver);
        card.addEventListener("drop", onDropReorder);
        card.addEventListener("dragend", onDragEnd);
    });
}

// --- Drag-to-Reorder ---

let dragIndex = null;

function onDragStart(e) {
    dragIndex = +e.currentTarget.dataset.index;
    e.currentTarget.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

function onDropReorder(e) {
    e.preventDefault();
    const targetIndex = +e.currentTarget.dataset.index;
    if (dragIndex === null || dragIndex === targetIndex) return;

    const [moved] = files.splice(dragIndex, 1);
    files.splice(targetIndex, 0, moved);
    dragIndex = null;
    renderPreviews();
}

function onDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
    dragIndex = null;
}

// --- Form Submission (blob response) ---

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    if (files.length < MIN_IMAGES) {
        showError("Upload at least " + MIN_IMAGES + " images.");
        return;
    }

    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    formData.append("duration", durationInput.value);

    submitBtn.disabled = true;
    progress.hidden = false;

    try {
        const res = await fetch("/upload", { method: "POST", body: formData });

        if (!res.ok) {
            const data = await res.json();
            showError(data.error || "Upload failed.");
            submitBtn.disabled = false;
            progress.hidden = true;
            return;
        }

        // Receive GIF as blob
        const blob = await res.blob();
        showResult(blob);
    } catch (err) {
        showError("Network error. Please try again.");
        submitBtn.disabled = false;
        progress.hidden = true;
    }
});

// --- Result Display ---

function showResult(blob) {
    // Clean up previous blob URL
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = URL.createObjectURL(blob);

    gifPreview.src = currentBlobUrl;
    downloadBtn.href = currentBlobUrl;

    // Hide upload UI, show result
    form.hidden = true;
    resultSection.hidden = false;
    progress.hidden = true;
}

// --- Make Another ---

makeAnotherBtn.addEventListener("click", () => {
    // Clean up blob
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }

    // Reset state
    files = [];
    renderPreviews();
    submitBtn.disabled = true;
    gifPreview.src = "";

    // Swap views
    resultSection.hidden = true;
    form.hidden = false;
});
