let canvas;
let ctx;
let widthInput;
let heightInput;
let zoomInput;
let renderBtn;

let buffer = [];
let palette = [];
let currentWidth = 0;
let currentHeight = 0;
let currentZoom = 4;
const vscode = acquireVsCodeApi();

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    widthInput = document.getElementById('width');
    heightInput = document.getElementById('height');
    zoomInput = document.getElementById('zoom');
    renderBtn = document.getElementById('render');

    document.getElementById('loadImage').addEventListener('click', () => {
        vscode.postMessage({ command: 'selectImage' });
    });

    document.getElementById('loadPalette').addEventListener('click', () => {
        vscode.postMessage({ command: 'selectPalette' });
    });

    zoomInput.addEventListener('change', () => {
        currentZoom = parseInt(zoomInput.value, 10) || 1;

        if (currentWidth > 0 && currentHeight > 0) {
            render(currentWidth, currentHeight, currentZoom);
        }
    });

    renderBtn.addEventListener('click', () => {
        console.log('render button clicked', { width: widthInput.value, height: heightInput.value, bufferLength: buffer.length });

        const width = parseInt(widthInput.value, 10);
        const height = parseInt(heightInput.value, 10);
        const zoom = parseInt(zoomInput.value, 10) || 1;

        if (!width || !height) {
            alert('Invalid size');
            return;
        }

        if (width * height !== buffer.length) {
            alert('Size does not match buffer length');
            return;
        }

        currentWidth = width;
        currentHeight = height;
        currentZoom = zoom;

        render(width, height, zoom);
    });

    vscode.postMessage({ command: 'webviewReady' });
});

window.addEventListener('message', event => {
    const msg = event.data;

    if (msg.command === 'imageLoaded') {
        buffer = msg.buffer;
        autoDetect();
        return;
    }

    if (msg.command === 'paletteLoaded') {
        palette = msg.palette;
        return;
    }

    if (msg.buffer && msg.palette) {
        buffer = msg.buffer;
        palette = msg.palette;
        autoDetect();
    }
});

// 🔹 Try common widths
function autoDetect() {
    const commonWidths = [256, 128, 320, 64];

    for (const w of commonWidths) {
        if (buffer.length % w === 0) {
            widthInput.value = w;
            heightInput.value = buffer.length / w;
            break;
        }
    }
}

function render(width, height, zoom) {
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < buffer.length; i++) {
        const idx = buffer[i];
        const color = palette[idx] || { r: 0, g: 0, b: 0 };
        const offset = i * 4;

        imageData.data[offset] = color.r;
        imageData.data[offset + 1] = color.g;
        imageData.data[offset + 2] = color.b;
        imageData.data[offset + 3] = 255;
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