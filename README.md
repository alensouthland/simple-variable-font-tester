# Font Tester 🎨

A modern, interactive web application for testing and exploring variable fonts. Adjust font axes in real-time, animate variations, and preview text with full control over typographic parameters.

## Features

✨ **Variable Font Support**
- Load TTF, OTF, WOFF, and WOFF2 font files
- Automatically detects and displays all variable axes
- Real-time preview of font variations

🎚️ **Interactive Controls**
- Individual sliders for each font axis
- Font size adjustment (12px - 200px)
- Play/pause animation for smooth axis transitions

🎭 **Theme Support**
- Light and dark mode toggle
- Theme preference saved to localStorage
- Smooth transitions between themes

💾 **Smart Font Management**
- Load fonts from local disk
- Refresh fonts without losing preview text
- File name display for tracking loaded fonts

📝 **Full-Featured Editor**
- Large textarea for text preview
- Real-time font rendering
- Reset text to default with one click

## File Structure

```
font-tester/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling
├── script.js           # All JavaScript functionality
├── OOPR-Tester.png     # Logo image (optional)
└── README.md           # This file
```

## Setup & Usage

### Quick Start

1. **Place all files in a directory:**
   ```
   font-tester/
   ├── index.html
   ├── styles.css
   ├── script.js
   ├── OOPR-Tester.png (optional)
   └── Your-Font-File.ttf
   ```

2. **Run a local server** (required for file access):
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (with http-server)
   npx http-server
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

### Loading Fonts

**Method 1: Using File System Access API (Modern Browsers)**
- Click "Select Font" button
- Choose a font file from your disk
- Font loads automatically
- Click refresh icon to reload updated font

**Method 2: Place Fonts in Directory**
- Add `.ttf`, `.otf`, `.woff`, or `.woff2` files to the same folder
- Click "Select Font" and browse your files

## How to Use

### Basic Workflow

1. **Load a Variable Font**
   - Click "Select Font" button
   - Choose a variable font file
   - Success message appears when loaded

2. **Explore Font Axes**
   - Each axis appears as a slider
   - Adjust sliders to see real-time changes
   - Current values shown in DM Mono font

3. **Adjust Font Size**
   - Use "Size" slider (12px - 200px)
   - Preview updates instantly

4. **Animate Axes**
   - Click play button (🎬) next to any axis
   - Font smoothly oscillates through the axis range
   - Click pause button to stop animation

5. **Edit Preview Text**
   - Type directly in the textarea
   - Text preserves styling from current axis values
   - Click "Reset Text" to restore default

### Features in Detail

**Dark Mode**
- Click sun/moon icon in header
- Preference saves automatically
- All colors adjust smoothly

**Font Refresh**
- Edit font files externally
- Click refresh icon to reload
- Preview text stays intact

**Axis Animation**
- Smooth sinusoidal animation over 4 seconds
- Loops continuously while playing
- Multiple axes can animate with smooth interaction

## Supported Font Formats

| Format | Support | Notes |
|--------|---------|-------|
| TTF    | ✅ Full | TrueType Variable Fonts |
| OTF    | ✅ Full | OpenType Variable Fonts |
| WOFF   | ✅ Full | Web Open Font Format (decompressed) |
| WOFF2  | ⚠️ No   | Requires Brotli decompression |

## Technical Details

### Dependencies

- **Pako** (v2.0.4): WOFF decompression
  - CDN: `https://cdn.jsdelivr.net/npm/pako@2.0.4/dist/pako.min.js`

- **Google Fonts**: Typography
  - DM Sans (400, 500, 600, 700 weights)
  - DM Mono (400, 500 weights)
  - Material Icons (filled)
  - Material Symbols Outlined

### Browser Compatibility

**Recommended:**
- Chrome/Edge 89+
- Firefox 87+
- Safari 15+

**Requirements:**
- File System Access API (recommended)
- CSS Grid & Flexbox
- ES6 JavaScript
- Web Fonts support

### Font Axis Detection

The app reads OpenType `fvar` table to detect:
- Axis tags (e.g., `wght`, `wdth`)
- Min, default, and max values
- Readable axis names (Weight, Width, etc.)

## Code Organization

### HTML (`index.html`)
- Document structure
- External stylesheet and script references
- Semantic markup for accessibility

### CSS (`styles.css`)
- CSS custom properties (variables) for theming
- Responsive design with media queries
- Smooth transitions and animations
- Custom scrollbar styling

### JavaScript (`script.js`)
- Modular function organization
- Detailed JSDoc comments
- Event delegation
- Font loading and parsing
- WOFF decompression
- Animation loop with requestAnimationFrame

## Customization

### Change Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --bg-primary: #fafafa;      /* Light background */
    --text-primary: #1a1a1a;    /* Light text */
    /* ... more variables */
}

body.dark-mode {
    --bg-primary: #1a1a1a;      /* Dark background */
    --text-primary: #f0f0f0;    /* Dark text */
    /* ... more variables */
}
```

### Modify Font Size Range

In `script.js`, find `renderControls()`:

```javascript
<input type="range" id="fontSizeSlider" 
       min="12" max="200" value="${fontSize}" step="1">
```

Change `min` and `max` values as needed.

### Change Animation Speed

In `script.js`, find `startAnimation()`:

```javascript
const cycle = 4000;  // milliseconds (change to adjust speed)
```

### Update Logo

Replace `OOPR-Tester.png` with your own image, or edit the img tag in `index.html`.

## Performance Tips

- Variable fonts with many axes may be slower to animate
- Use modern browsers for best performance
- Close other applications for smooth animations
- Font files up to ~500KB load smoothly

## Known Limitations

- WOFF2 format requires Brotli decompression (not implemented)
- Some extended axis names may not be recognized
- Animation is single-axis (one axis at a time)

## License

This project is open source and available for personal and commercial use.

## Contributing

Contributions welcome! Areas for improvement:

- [ ] WOFF2 support with Brotli decompression
- [ ] Multi-axis animation
- [ ] Export settings/variations
- [ ] Font comparison mode
- [ ] Keyboard shortcuts
- [ ] Mobile touch optimizations

## Troubleshooting

**"Failed to open file picker"**
- Ensure you're using a modern browser (Chrome, Edge, Firefox)
- Use fallback file input (use `<input type="file">`)

**Font not loading**
- Check file format (TTF, OTF, WOFF supported)
- Verify file is in the same directory as HTML
- Check browser console for errors

**Slow animations**
- Close other applications
- Try a smaller font file
- Check if browser is under heavy load

**Styles not applying**
- Clear browser cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)
- Verify `styles.css` is in same folder as `index.html`
- Check browser console for 404 errors

## Related Resources

- [OpenType Variable Fonts](https://docs.microsoft.com/en-us/typography/opentype/spec/fvar)
- [Google Fonts Variable API](https://fonts.google.com/metadata/fonts)
- [Variable Font Resources](https://www.v-fonts.com/)
- [Material Design Icons](https://fonts.google.com/icons)

---

**Made with ❤️ for font designers and enthusiasts**
