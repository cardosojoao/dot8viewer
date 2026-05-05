let canvas;
let ctx;
let widthInput;
let heightInput;
let modeInput;
let tileControls;
let tileWidthInput;
let tileHeightInput;
let zoomInput;
let renderBtn;

let buffer = [];
let palette = [];
let currentWidth = 0;
let currentHeight = 0;
let currentZoom = 4;
let currentMode = 'linear';
let currentTileWidth = 8;
let currentTileHeight = 8;
const vscode = acquireVsCodeApi();

// Grab the page elements once the webview is ready.
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    widthInput = document.getElementById('width');
    heightInput = document.getElementById('height');
    modeInput = document.getElementById('mode');
    tileControls = document.getElementById('tileControls');
    tileWidthInput = document.getElementById('tileWidth');
    tileHeightInput = document.getElementById('tileHeight');
    zoomInput = document.getElementById('zoom');
    renderBtn = document.getElementById('render');

    // Ask the extension host to pick another image file.
    document.getElementById('loadImage').addEventListener('click', () => {
        vscode.postMessage({ command: 'selectImage' });
    });

    // Ask the extension host to pick another palette file.
    document.getElementById('loadPalette').addEventListener('click', () => {
        vscode.postMessage({ command: 'selectPalette' });
    });

    modeInput.addEventListener('change', () => {
        updateTileControls();
        rerenderCurrent();
    });

    tileWidthInput.addEventListener('change', rerenderCurrent);
    tileHeightInput.addEventListener('change', rerenderCurrent);
    widthInput.addEventListener('change', rerenderCurrent);
    heightInput.addEventListener('change', rerenderCurrent);

    zoomInput.addEventListener('change', () => {
        currentZoom = parseInt(zoomInput.value, 10) || 1;
        rerenderCurrent();
    });

    // Render uses the values currently shown in the form.
    renderBtn.addEventListener('click', () => {
        console.log('render button clicked', { width: widthInput.value, height: heightInput.value, bufferLength: buffer.length });

        const settings = getRenderSettings();
        if (!settings) {
            return;
        }

        currentWidth = settings.width;
        currentHeight = settings.height;
        currentZoom = settings.zoom;
        currentMode = settings.mode;
        currentTileWidth = settings.tileWidth;
        currentTileHeight = settings.tileHeight;

        render(settings);
        persistSettings(settings);
    });

    updateTileControls();

    // Tell the extension host that the webview can receive startup data.
    vscode.postMessage({ command: 'webviewReady' });
});

// Receive files and saved settings from the extension host.
window.addEventListener('message', event => {
    const msg = event.data;

    if (msg.command === 'imageLoaded') {
        buffer = msg.buffer;
        return;
    }

    if (msg.command === 'paletteLoaded') {
        palette = msg.palette;
        return;
    }

    if (msg.command === 'viewerSettings' && msg.settings) {
        applyStoredSettings(msg.settings);
        return;
    }

    if (msg.buffer && msg.palette) {
        buffer = msg.buffer;
        palette = msg.palette;
    }
});

/**
 * Show or hide the tile size inputs based on the selected render mode.
 */
function updateTileControls() {
    tileControls.style.display = modeInput.value === 'tilesheet' ? 'inline' : 'none';
}

/**
 * Apply saved values to the form so the last setup can be reused.
 */
function applyStoredSettings(settings) {
    if (settings.width) {
        widthInput.value = settings.width;
    }
    if (settings.height) {
        heightInput.value = settings.height;
    }
    if (settings.zoom) {
        zoomInput.value = String(settings.zoom);
    }
    if (settings.mode === 'linear' || settings.mode === 'tilesheet') {
        modeInput.value = settings.mode;
    }
    if (settings.tileWidth) {
        tileWidthInput.value = settings.tileWidth;
    }
    if (settings.tileHeight) {
        tileHeightInput.value = settings.tileHeight;
    }

    updateTileControls();
}

/**
 * Send the current render options back to the extension host.
 */
function persistSettings(settings) {
    vscode.postMessage({
        command: 'saveSettings',
        settings: {
            width: settings.width,
            height: settings.height,
            zoom: settings.zoom,
            mode: settings.mode,
            tileWidth: settings.tileWidth,
            tileHeight: settings.tileHeight
        }
    });
}

/**
 * Rerender after small form changes when the image size is already known.
 */
function rerenderCurrent() {
    if (currentWidth <= 0 || currentHeight <= 0) {
        return;
    }

    const settings = getRenderSettings();
    if (!settings) {
        return;
    }

    currentWidth = settings.width;
    currentHeight = settings.height;
    currentZoom = settings.zoom;
    currentMode = settings.mode;
    currentTileWidth = settings.tileWidth;
    currentTileHeight = settings.tileHeight;

    render(settings);
    persistSettings(settings);
}

/**
 * Read the current form values and reject combinations that cannot work.
 * Returns null when the inputs do not match the loaded image data.
 */
function getRenderSettings() {
    const width = parseInt(widthInput.value, 10);
    const height = parseInt(heightInput.value, 10);
    const zoom = parseInt(zoomInput.value, 10) || 1;
    const mode = modeInput.value;
    const tileWidth = parseInt(tileWidthInput.value, 10) || 0;
    const tileHeight = parseInt(tileHeightInput.value, 10) || 0;
    let tileColumns = 0;
    let tileRows = 0;

    if (!width || !height) {
        alert('Invalid size');
        return null;
    }

    if (width * height !== buffer.length) {
        alert('Size does not match buffer length');
        return null;
    }

    if (mode === 'tilesheet') {
        if (!tileWidth || !tileHeight) {
            alert('Invalid tile size');
            return null;
        }

        if (width % tileWidth !== 0 || height % tileHeight !== 0) {
            alert('Tile size must divide image width and height exactly');
            return null;
        }

        tileColumns = width / tileWidth;
        tileRows = height / tileHeight;
    }

    return { width, height, zoom, mode, tileWidth, tileHeight, tileColumns, tileRows };
}

/**
 * Draw the indexed image onto a temporary canvas, then scale it up without smoothing.
 */
function render(settings) {
    const { width, height, zoom, mode, tileWidth, tileHeight, tileColumns, tileRows } = settings;
    const imageData = ctx.createImageData(width, height);

    if (mode === 'tilesheet') {
        const pixelsPerTile = tileWidth * tileHeight;
        const totalTiles = tileColumns * tileRows;

        if (totalTiles * pixelsPerTile !== buffer.length) {
            alert('Tile grid does not match buffer size');
            return;
        }

        // Each tile is read as one small linear image block.
        for (let tileRow = 0; tileRow < tileRows; tileRow++) {
            for (let tileCol = 0; tileCol < tileColumns; tileCol++) {
                const tileIndex = tileRow * tileColumns + tileCol;
                // index of begin of tile
                const tileBufferStart = tileIndex * pixelsPerTile;

                for (let localY = 0; localY < tileHeight; localY++) {
                    for (let localX = 0; localX < tileWidth; localX++) {
                        // pixel of tile 0..63
                        const pixelInTile = localY * tileWidth + localX;
                        // real pixel of tile in image
                        const sourceIndex = tileBufferStart + pixelInTile;
                        // color index
                        const idx = buffer[sourceIndex];
                        // get color from palette
                        const color = palette[idx] || { r: 0, g: 0, b: 0 };

                        const pixelX = tileCol * tileWidth + localX;
                        const pixelY = tileRow * tileHeight + localY;
                        
                        
                        const offset = (pixelY * width + pixelX) * 4;

                        imageData.data[offset] = color.r;
                        imageData.data[offset + 1] = color.g;
                        imageData.data[offset + 2] = color.b;
                        imageData.data[offset + 3] = 255;
                    }
                }
            }
        }
    } else {
        for (let i = 0; i < buffer.length; i++) {
            const idx = buffer[i];
            const color = palette[idx] || { r: 0, g: 0, b: 0 };
            const offset = i * 4;

            imageData.data[offset] = color.r;
            imageData.data[offset + 1] = color.g;
            imageData.data[offset + 2] = color.b;
            imageData.data[offset + 3] = 255;
        }
    }

    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    temp.getContext('2d').putImageData(imageData, 0, 0);

    canvas.width = width * zoom;
    canvas.height = height * zoom;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
}