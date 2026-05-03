import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

type RGB = { r: number; g: number; b: number };
type ViewerSettings = {
	width?: number;
	height?: number;
	zoom?: number;
	mode?: 'linear' | 'tilesheet';
	tileWidth?: number;
	tileHeight?: number;
};

// Remember the last folders and viewer options between runs.
const LAST_IMAGE_DIR_KEY = 'spectrumViewer.lastImageDir';
const LAST_PALETTE_DIR_KEY = 'spectrumViewer.lastPaletteDir';
const VIEWER_SETTINGS_KEY = 'spectrumViewer.viewerSettings';

/**
 * Register the command that opens the raw-image viewer.
 */
export function activate(context: vscode.ExtensionContext) {

	const command = vscode.commands.registerCommand('spectrumViewer.open', async () => {
		const storedSettings = getStoredViewerSettings(context);

		// Pick the raw indexed image file.
		const fileUri = await vscode.window.showOpenDialog({
			title: "Select Raw Indexed File",
			defaultUri: getDefaultOpenUri(context, LAST_IMAGE_DIR_KEY),
			canSelectMany: false
		});

		if (!fileUri) {
			return;
		}
		await storeDirectoryForFile(context, LAST_IMAGE_DIR_KEY, fileUri[0]);

		// Pick the GPL palette file.
		const paletteUri = await vscode.window.showOpenDialog({
			title: "Select GPL Palette",
			defaultUri: getDefaultOpenUri(context, LAST_PALETTE_DIR_KEY),
			filters: { 'GIMP Palette': ['gpl'] },
			canSelectMany: false
		});

		if (!paletteUri) {
			return;
		}
		await storeDirectoryForFile(context, LAST_PALETTE_DIR_KEY, paletteUri[0]);

		// Ask for the image width. Height is worked out from the file size.
		const widthInput = await vscode.window.showInputBox({
			prompt: "Enter image width (pixels)",
			value: storedSettings.width ? String(storedSettings.width) : undefined,
			validateInput: (value) => {
				const n = Number(value);
				if (isNaN(n) || n <= 0) {
					return "Enter a valid number";
				}
				return null;
			}
		});

		if (!widthInput) {
			return;
		}

		const width = parseInt(widthInput, 10);

		try {
			const rawBuffer = fs.readFileSync(fileUri[0].fsPath);
			const paletteText = fs.readFileSync(paletteUri[0].fsPath, 'utf-8');

			const palette = parseGPL(paletteText);
			const { height, indices } = parseRawIndexed(rawBuffer, width);
			const initialData = {
				buffer: Array.from(rawBuffer),
				palette,
				width,
				height
			};

			// Warn if the image uses colours that the palette does not provide.
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

			// The webview asks for data and reports setting changes through messages.
			panel.webview.onDidReceiveMessage(async (message) => {
				if (message.command === 'webviewReady') {
					// Send saved options first, then send the current image data.
					panel.webview.postMessage({
						command: 'viewerSettings',
						settings: getStoredViewerSettings(context)
					});
					panel.webview.postMessage(initialData);
					return;
				}

				if (message.command === 'saveSettings') {
					await storeViewerSettings(context, message.settings);
					return;
				}

				if (message.command === 'selectImage') {

					const fileUri = await vscode.window.showOpenDialog({
						title: "Select Raw Indexed File",
						defaultUri: getDefaultOpenUri(context, LAST_IMAGE_DIR_KEY),
						canSelectMany: false
					});

					if (!fileUri) {
						return;
					}
					await storeDirectoryForFile(context, LAST_IMAGE_DIR_KEY, fileUri[0]);

					const rawBuffer = fs.readFileSync(fileUri[0].fsPath);

					panel.webview.postMessage({
						command: 'imageLoaded',
						buffer: Array.from(rawBuffer)
					});
				}

				if (message.command === 'selectPalette') {

					const paletteUri = await vscode.window.showOpenDialog({
						title: "Select GPL Palette",
						defaultUri: getDefaultOpenUri(context, LAST_PALETTE_DIR_KEY),
						filters: { 'GIMP Palette': ['gpl'] },
						canSelectMany: false
					});

					if (!paletteUri) {
						return;
					}
					await storeDirectoryForFile(context, LAST_PALETTE_DIR_KEY, paletteUri[0]);

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

/**
 * Read a saved folder path from global state.
 */
function getStoredDirectoryUri(context: vscode.ExtensionContext, key: string): vscode.Uri | undefined {
	const storedPath = context.globalState.get<string>(key);
	return storedPath ? vscode.Uri.file(storedPath) : undefined;
}

/**
 * Pick the best starting folder for an open-file dialog.
 * Uses the last saved folder first, then the active file, then the workspace.
 */
function getDefaultOpenUri(context: vscode.ExtensionContext, key: string): vscode.Uri | undefined {
	const storedUri = getStoredDirectoryUri(context, key);
	if (storedUri) {
		return storedUri;
	}

	const activeUri = vscode.window.activeTextEditor?.document.uri;
	if (activeUri?.scheme === 'file') {
		return vscode.Uri.file(path.dirname(activeUri.fsPath));
	}

	return vscode.workspace.workspaceFolders?.[0]?.uri;
}

async function storeDirectoryForFile(context: vscode.ExtensionContext, key: string, fileUri: vscode.Uri) {
	await context.globalState.update(key, path.dirname(fileUri.fsPath));
}

/**
 * Read the saved viewer options.
 */
function getStoredViewerSettings(context: vscode.ExtensionContext): ViewerSettings {
	return context.globalState.get<ViewerSettings>(VIEWER_SETTINGS_KEY) ?? {};
}

/**
 * Save the latest viewer options sent by the webview.
 */
async function storeViewerSettings(context: vscode.ExtensionContext, settings: ViewerSettings) {
	await context.globalState.update(VIEWER_SETTINGS_KEY, settings);
}

/**
 * Convert raw bytes into palette indexes and calculate the image height.
 * Throws when the byte count does not match the given width.
 */
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

/**
 * Read RGB values from a GIMP GPL palette file.
 */
function parseGPL(text: string): RGB[] {

	const colors: RGB[] = [];

	for (const line of text.split('\n')) {
		const trimmed = line.trim();

		if (
			!trimmed ||
			trimmed.startsWith('#') ||
			trimmed.startsWith('GIMP') ||
			trimmed.startsWith('Name')
		) {
			continue;
		}

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

/**
 * Load the webview HTML and replace the local script path with a webview-safe URI.
 */
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

/**
 * Called when VS Code shuts down the extension.
 */
export function deactivate() { }