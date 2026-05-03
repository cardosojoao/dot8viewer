import * as vscode from 'vscode';
import * as fs from 'fs';

type RGB = { r: number; g: number; b: number };

export function activate(context: vscode.ExtensionContext) {

	const command = vscode.commands.registerCommand('spectrumViewer.open', async () => {

		// Select RAW file (your "fake png")
		const fileUri = await vscode.window.showOpenDialog({
			title: "Select Raw Indexed File",
			canSelectMany: false
		});

		if (!fileUri) return;

		// Select GPL palette
		const paletteUri = await vscode.window.showOpenDialog({
			title: "Select GPL Palette",
			filters: { 'GIMP Palette': ['gpl'] },
			canSelectMany: false
		});

		if (!paletteUri) return;

		// Ask for width
		const widthInput = await vscode.window.showInputBox({
			prompt: "Enter image width (pixels)",
			validateInput: (value) => {
				const n = Number(value);
				if (isNaN(n) || n <= 0) return "Enter a valid number";
				return null;
			}
		});

		if (!widthInput) return;

		const width = parseInt(widthInput, 10);

		try {
			const rawBuffer = fs.readFileSync(fileUri[0].fsPath);
			const paletteText = fs.readFileSync(paletteUri[0].fsPath, 'utf-8');

			const palette = parseGPL(paletteText);
			const { height, indices } = parseRawIndexed(rawBuffer, width);
			const initialData = {
				buffer: Array.from(rawBuffer),
				palette
			};

			// Validate palette coverage
			const maxIndex = Math.max(...indices);
			if (maxIndex >= palette.length) {
				vscode.window.showWarningMessage(
					`Palette has ${palette.length} colors but image uses index ${maxIndex}`
				);
			}

			const panel = vscode.window.createWebviewPanel(
				'spectrumViewer',
				'Raw Indexed Viewer',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.joinPath(context.extensionUri, 'media')
					]
				}
			);

			panel.webview.onDidReceiveMessage(async (message) => {
				if (message.command === 'webviewReady') {
					panel.webview.postMessage(initialData);
					return;
				}

				if (message.command === 'selectImage') {

					const fileUri = await vscode.window.showOpenDialog({
						title: "Select Raw Indexed File",
						canSelectMany: false
					});

					if (!fileUri) return;

					const rawBuffer = fs.readFileSync(fileUri[0].fsPath);

					panel.webview.postMessage({
						command: 'imageLoaded',
						buffer: Array.from(rawBuffer)
					});
				}

				if (message.command === 'selectPalette') {

					const paletteUri = await vscode.window.showOpenDialog({
						title: "Select GPL Palette",
						filters: { 'GIMP Palette': ['gpl'] },
						canSelectMany: false
					});

					if (!paletteUri) return;

					const paletteText = fs.readFileSync(paletteUri[0].fsPath, 'utf-8');
					const palette = parseGPL(paletteText);

					panel.webview.postMessage({
						command: 'paletteLoaded',
						palette
					});
				}
			});

			panel.webview.html = getHtml(panel.webview, context.extensionUri);

		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
		}
	});

	context.subscriptions.push(command);
}

// 🔹 Parse RAW indexed buffer
function parseRawIndexed(buffer: Buffer, width: number) {

	const totalPixels = buffer.length;

	if (totalPixels % width !== 0) {
		throw new Error(`Buffer size (${totalPixels}) is not divisible by width (${width})`);
	}

	const height = totalPixels / width;

	const indices: number[] = new Array(totalPixels);

	for (let i = 0; i < totalPixels; i++) {
		indices[i] = buffer[i];
	}

	return { width, height, indices };
}

// 🔹 Parse GPL palette
function parseGPL(text: string): RGB[] {

	const colors: RGB[] = [];

	for (const line of text.split('\n')) {
		const trimmed = line.trim();

		if (
			!trimmed ||
			trimmed.startsWith('#') ||
			trimmed.startsWith('GIMP') ||
			trimmed.startsWith('Name')
		) continue;

		const parts = trimmed.split(/\s+/);

		if (parts.length >= 3) {
			const r = Number(parts[0]);
			const g = Number(parts[1]);
			const b = Number(parts[2]);

			if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
				colors.push({ r, g, b });
			}
		}
	}

	return colors;
}

// 🔹 Webview HTML
function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {

	const htmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'index.html');
	let html = require('fs').readFileSync(htmlPath.fsPath, 'utf-8');

	// Fix script path for webview
	const scriptUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'media', 'viewer.js')
	);

	html = html.replace('viewer.js', scriptUri.toString());

	return html;
}

export function deactivate() { }