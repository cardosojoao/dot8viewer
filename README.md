# dot8viewer

A VS Code extension for viewing raw indexed image files, particularly designed for ZX Spectrum Next sprite formats. This extension allows you to visualize raw binary image data using GIMP palette (.gpl) files.

## Features

- **Raw Indexed Image Viewer**: Open and view raw indexed image files in a dedicated webview panel
- **GPL Palette Support**: Load GIMP palette files (.gpl) to define the color mapping for indexed images
- **Interactive Viewing**: Zoom in/out, switch between linear and tilesheet display modes
- **Dynamic Loading**: Change images and palettes directly from the viewer interface
- **Persistent Settings**: Remembers your last used directories and viewer preferences
- **Width Configuration**: Specify image width; height is automatically calculated from file size

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run the command "Spectrum Next Viewer"
3. Select your raw indexed image file
4. Select a GIMP palette (.gpl) file
5. Enter the image width in pixels
6. The image will open in a new panel with interactive controls

## Requirements

- VS Code 1.118.0 or later
- Raw indexed image files (binary data where each byte represents a palette index)
- GIMP palette files (.gpl) containing RGB color definitions

## Extension Settings

This extension does not contribute any VS Code settings. It uses VS Code's global state to remember:
- Last used image directory
- Last used palette directory
- Viewer settings (zoom, mode, tile dimensions)

## Known Issues

- Palette validation: The extension will warn if your image uses color indices beyond what's defined in the palette

## Release Notes

### 0.0.1

Initial release with basic raw indexed image viewing capabilities.

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
