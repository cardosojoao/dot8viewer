# dot8viewer

A VS Code extension for viewing raw indexed image files, particularly designed for ZX Spectrum Next sprite formats. This extension allows you to visualize raw binary image data using GIMP palette (.gpl) files.

## Features

- **Raw Indexed Image Viewer**: Open and view raw indexed image files in a dedicated webview panel with pixel-perfect rendering
- **GPL Palette Support**: Load GIMP palette files (.gpl) to define the color mapping for indexed images with automatic color validation
- **Interactive Viewing**: 
  - Zoom in/out (1x to 16x magnification)
  - Switch between linear and tilesheet display modes
  - Real-time rendering with no smoothing for crisp pixel art
- **Dynamic Loading**: Change images and palettes directly from the viewer interface without reopening
- **Persistent Settings**: Remembers your last used directories, zoom level, and viewer mode preferences across sessions
- **Width Configuration**: Specify image width; height is automatically calculated from file size
- **Tilesheet Mode**: View sprite sheets with configurable tile dimensions for easier asset management

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "dot8viewer"
4. Click Install

### From Source
1. Clone the repository: `git clone https://github.com/cardosojoao/dot8viewer.git`
2. Navigate to the folder: `cd dot8viewer`
3. Install dependencies: `npm install`
4. Compile the extension: `npm run compile`
5. Open in VS Code and press F5 to launch the extension in debug mode

## Usage

### Basic Workflow
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run the command "Dot8 Sprite Viewer"
3. On first run or if no saved files exist:
   - Select your raw indexed image file (.spr or binary format)
   - Select a GIMP palette (.gpl) file
   - Enter the image width in pixels
4. The image opens in a new panel with interactive controls

### Viewing Controls
Once the viewer is open, you can:
- **Load New Image**: Click "Load Image" button to open a different sprite file
- **Load New Palette**: Click "Load Palette" button to change the color palette
- **Adjust Width**: Modify the width value and click "Render" to recalculate height
- **Zoom**: Use the zoom slider (1-16x) for detailed pixel inspection
- **Display Mode**: 
  - **Linear**: View the raw image data as a flat rectangle
  - **Tilesheet**: View as a grid of tiles (specify tile width and height)
- **Tile Configuration**: When in tilesheet mode, set tile dimensions and the viewer reorganizes the display accordingly

### Advanced Examples

**Example 1: Viewing a ZX Spectrum Sprite**
```
Image file: character.spr (256 bytes)
Palette: spectrum.gpl (16 colors)
Width: 16 pixels
Result: 16x16 sprite (256 bytes ÷ 16 = 16 pixels high)
```

**Example 2: Viewing a Tilesheet**
```
Image file: tiles.spr (2048 bytes)
Palette: tileset.gpl
Width: 64 pixels
Tilesheet Mode: 8x8 pixel tiles
Result: 64x32 image displayed as 8x4 grid of tiles
```

**Example 3: Using with Previous Settings**
```
If you've already opened images with this extension:
- Run the command again
- Previous files and settings are automatically loaded if they still exist
- No need to reselect files unless you want to change them
```

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