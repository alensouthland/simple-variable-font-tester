// State variables
let currentFont = null;
let fontAxes = [];
let axisValues = {};
let fontFeatures = {};
let enabledFeatures = {};
let fontSize = 64;
let isPlaying = false;
let animationId = null;
let playStartTime = null;
let playingAxisIndex = 0;
let selectedFontFileHandle = null;
let selectedFontFileName = null;
let fileSelectionMethod = null;

const defaultPreviewText = "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 1234567890 !@#$%^&*()_+-=[]{}|;':\",./<>?";

// DOM elements
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const pickFontButton = document.getElementById('pickFontButton');
const refreshFontButton = document.getElementById('refreshFontButton');
const selectedFileName = document.getElementById('selectedFileName');
const controlsContainer = document.getElementById('controlsContainer');
const preview = document.getElementById('preview');
const resetTextBtn = document.getElementById('resetText');
const errorContainer = document.getElementById('errorContainer');

// Create hidden file input for fallback
const hiddenFileInput = document.createElement('input');
hiddenFileInput.type = 'file';
hiddenFileInput.accept = '.ttf,.otf,.woff2,.woff';
hiddenFileInput.style.display = 'none';
document.body.appendChild(hiddenFileInput);

// Initialize
initializeTheme();
attachEventListeners();

/**
 * Initialize theme from localStorage
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.classList.add('dark-mode');
    }
}

/**
 * Attach all event listeners
 */
function attachEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);
    pickFontButton.addEventListener('click', pickFontFile);
    refreshFontButton.addEventListener('click', refreshFont);
    resetTextBtn.addEventListener('click', resetPreviewText);
    hiddenFileInput.addEventListener('change', handleFileInputChange);
    preview.addEventListener('input', updatePreview);
}

/**
 * Toggle between light and dark mode
 */
function toggleTheme() {
    body.classList.toggle('dark-mode');
    themeToggle.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/**
 * Reset preview text to default
 */
function resetPreviewText() {
    preview.value = defaultPreviewText;
    updatePreview();
}

/**
 * Open file picker dialog
 */
async function pickFontFile() {
    if (window.showOpenFilePicker) {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Font Files',
                    accept: {
                        'font/ttf': ['.ttf'],
                        'font/otf': ['.otf'],
                        'font/woff2': ['.woff2'],
                        'font/woff': ['.woff'],
                    }
                }],
            });

            selectedFontFileHandle = fileHandle;
            selectedFontFileName = fileHandle.name;
            fileSelectionMethod = 'api';
            selectedFileName.textContent = `Selected: ${fileHandle.name}`;
            await loadFontFromHandle(fileHandle);
            refreshFontButton.style.display = 'block';

        } catch (error) {
            if (error.name !== 'AbortError') {
                showError(`Failed to open file picker: ${error.message}`);
            }
        }
    } else {
        fileSelectionMethod = 'input';
        hiddenFileInput.click();
    }
}

/**
 * Handle file input change (fallback for older browsers)
 */
function handleFileInputChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';
    fileSelectionMethod = 'input';
    selectedFontFileHandle = file;
    selectedFontFileName = file.name;
    selectedFileName.textContent = `Selected: ${file.name}`;
    loadFontFromFile(file);
    refreshFontButton.style.display = 'block';
}

/**
 * Refresh the currently loaded font
 */
async function refreshFont() {
    if (!selectedFontFileHandle && !selectedFontFileName) {
        showError('Please select a font file first.');
        return;
    }

    try {
        refreshFontButton.style.opacity = '0.5';
        refreshFontButton.disabled = true;
        
        // Stop animation if one is running
        if (isPlaying) {
            stopAnimation();
        }
        
        if (fileSelectionMethod === 'api' && selectedFontFileHandle) {
            await loadFontFromHandle(selectedFontFileHandle, true);
        } else if (selectedFontFileName) {
            try {
                // Add cache-busting query parameter + no-store option to force fresh fetch from disk
                // Query parameter: ?t=${Date.now()} - prevents browser cache
                // cache: 'no-store' - additional protection against caching
                const response = await fetch(`${selectedFontFileName}?t=${Date.now()}`, { 
                    cache: 'no-store' 
                });
                if (!response.ok) {
                    throw new Error(`File not found: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                await processFontData(arrayBuffer, true);
                showError(`Font refreshed: ${selectedFontFileName}`, true);
            } catch (error) {
                showError(`Could not refresh from disk. Make sure the file "${selectedFontFileName}" is in the same directory and you're running a local server.`);
            }
        } else {
            showError('No file selected.');
        }
        
        refreshFontButton.style.opacity = '1';
        refreshFontButton.disabled = false;
    } catch (error) {
        showError(`Failed to refresh font: ${error.message}`);
        refreshFontButton.style.opacity = '1';
        refreshFontButton.disabled = false;
    }
}

/**
 * Load font from file handle (File System Access API)
 */
async function loadFontFromHandle(fileHandle, isRefresh = false) {
    try {
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        await processFontData(arrayBuffer, isRefresh);
        if (isRefresh) {
            showError(`Font refreshed: ${file.name}`, true);
        }
    } catch (error) {
        throw new Error(`Could not read font file: ${error.message}`);
    }
}

/**
 * Load font from file input
 */
async function loadFontFromFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        await processFontData(arrayBuffer, false);
        showError(`Font loaded: ${file.name}`, true);
    } catch (error) {
        showError(`Failed to load font: ${error.message}`);
    }
}

/**
 * Decompress WOFF font to TTF/OTF
 */
async function decompressWOFF(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    const signature = dataView.getUint32(0, false);
    
    if (signature !== 0x774F4646) {
        throw new Error('Invalid WOFF signature');
    }
    
    const flavor = dataView.getUint32(4, false);
    const numTables = dataView.getUint16(12, false);
    const totalSfntSize = dataView.getUint32(16, false);
    
    const outBuffer = new Uint8Array(totalSfntSize);
    const outDataView = new DataView(outBuffer.buffer);
    
    const searchRange = Math.pow(2, Math.floor(Math.log2(numTables))) * 16;
    const entrySelector = Math.floor(Math.log2(numTables));
    const rangeShift = numTables * 16 - searchRange;
    
    outDataView.setUint32(0, flavor, false);
    outDataView.setUint16(4, numTables, false);
    outDataView.setUint16(6, searchRange, false);
    outDataView.setUint16(8, entrySelector, false);
    outDataView.setUint16(10, rangeShift, false);
    
    let woffTableOffset = 44;
    let outTableOffset = 12 + numTables * 16;
    const tableRecords = [];
    
    for (let i = 0; i < numTables; i++) {
        const tag = dataView.getUint32(woffTableOffset, false);
        const offset = dataView.getUint32(woffTableOffset + 4, false);
        const compLength = dataView.getUint32(woffTableOffset + 8, false);
        const origLength = dataView.getUint32(woffTableOffset + 12, false);
        const origChecksum = dataView.getUint32(woffTableOffset + 16, false);
        
        woffTableOffset += 20;
        
        const compData = new Uint8Array(arrayBuffer, offset, compLength);
        let decompData;
        
        if (compLength === origLength) {
            decompData = compData;
        } else {
            if (typeof pako === 'undefined') {
                throw new Error('Decompression library not loaded. Please reload the page.');
            }
            decompData = pako.inflate(compData);
        }
        
        outBuffer.set(decompData, outTableOffset);
        
        tableRecords.push({
            tag: tag,
            checksum: origChecksum,
            offset: outTableOffset,
            length: origLength
        });
        
        outTableOffset += origLength;
        const padding = (4 - (origLength % 4)) % 4;
        outTableOffset += padding;
    }
    
    let dirOffset = 12;
    tableRecords.forEach(record => {
        outDataView.setUint32(dirOffset, record.tag, false);
        outDataView.setUint32(dirOffset + 4, record.checksum, false);
        outDataView.setUint32(dirOffset + 8, record.offset, false);
        outDataView.setUint32(dirOffset + 12, record.length, false);
        dirOffset += 16;
    });
    
    return outBuffer.buffer;
}

/**
 * Process font data and load into document
 */
async function processFontData(arrayBuffer, isRefresh = false) {
    const dataView = new DataView(arrayBuffer);
    const signature = dataView.getUint32(0, false);
    
    if (signature === 0x774F4646) {
        try {
            arrayBuffer = await decompressWOFF(arrayBuffer);
        } catch (error) {
            throw new Error('Failed to decompress WOFF: ' + error.message);
        }
    } else if (signature === 0x574F4632) {
        throw new Error('WOFF2 format is not yet supported. Please use TTF, OTF, or WOFF format.');
    }
    
    // Revoke the old font URL before creating a new one to prevent memory leaks
    // This is especially important when refreshing fonts multiple times
    if (currentFont && currentFont.url) {
        try {
            URL.revokeObjectURL(currentFont.url);
        } catch (e) {
            // Silently ignore if URL already revoked
        }
    }
    
    const fontBlob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const fontUrl = URL.createObjectURL(fontBlob);

    const fontFamily = `VarFont-${Date.now()}`;
    const fontFace = new FontFace(fontFamily, `url('${fontUrl}')`, {
        style: 'normal',
        weight: '100 900',
    });

    try {
        const loadedFace = await fontFace.load();
        document.fonts.add(loadedFace);
    } catch (error) {
        throw new Error('Failed to load font into document');
    }

    currentFont = {
        family: fontFamily,
        url: fontUrl,
        blob: fontBlob,
    };

    await extractFontAxes(arrayBuffer, isRefresh);
    await extractOpenTypeFeatures(arrayBuffer);
    renderControls();
    renderFeatures();
    
    // Only reset preview text when loading a NEW font (not on refresh)
    if (!isRefresh) {
        preview.value = defaultPreviewText;
        preview.placeholder = '';
        resetTextBtn.style.display = 'block';
    }
    // Note: axisValues are reset in extractFontAxes based on isRefresh parameter
    // Note: feature states are set in extractOpenTypeFeatures
    
    await new Promise(resolve => setTimeout(resolve, 100));
    updatePreview();
}

/**
 * Extract OpenType features from font file
 */
async function extractOpenTypeFeatures(arrayBuffer) {
    try {
        const dataView = new DataView(arrayBuffer);
        
        // Find GSUB table
        const numTables = dataView.getUint16(4, false);
        let gsubOffset = null;
        
        for (let i = 0; i < numTables; i++) {
            const tableOffset = 12 + i * 16;
            const tag = new Uint8Array(arrayBuffer, tableOffset, 4);
            const tableTag = String.fromCharCode(tag[0], tag[1], tag[2], tag[3]);
            
            if (tableTag === 'GSUB') {
                gsubOffset = dataView.getUint32(tableOffset + 8, false);
                break;
            }
        }
        
        if (gsubOffset === null) {
            // No GSUB table, no features
            fontFeatures = {};
            enabledFeatures = {};
            return;
        }
        
        // Parse GSUB header
        // GSUB Header: Version (4 bytes) + 3 offsets (6 bytes)
        const featureListOffsetValue = dataView.getUint16(gsubOffset + 6, false);
        
        if (featureListOffsetValue === 0) {
            fontFeatures = {};
            enabledFeatures = {};
            return;
        }
        
        const featureListOffset = gsubOffset + featureListOffsetValue;
        
        // Parse Feature List
        const featureCount = dataView.getUint16(featureListOffset, false);
        const features = {};
        
        for (let i = 0; i < featureCount; i++) {
            const recordOffset = featureListOffset + 2 + (i * 6);
            
            // Read feature tag (4 bytes)
            const tagArray = new Uint8Array(arrayBuffer, recordOffset, 4);
            const featureTag = String.fromCharCode(
                tagArray[0], 
                tagArray[1], 
                tagArray[2], 
                tagArray[3]
            ).trim();
            
            if (featureTag.length > 0 && featureTag.length <= 4) {
                // Most features default to off, some to on
                const defaultOnFeatures = ['liga', 'dlig', 'calt', 'kern'];
                const isDefault = defaultOnFeatures.includes(featureTag);
                
                features[featureTag] = {
                    name: featureTag,
                    default: isDefault
                };
            }
        }
        
        fontFeatures = features;
        enabledFeatures = {};
        
        // Initialize enabled features based on defaults
        Object.keys(fontFeatures).forEach(tag => {
            enabledFeatures[tag] = fontFeatures[tag].default;
        });
        
    } catch (error) {
        // Silent fail - just no features
        fontFeatures = {};
        enabledFeatures = {};
    }
}

/**
 * Extract variable axes from font file
 */
async function extractFontAxes(arrayBuffer, isRefresh = false) {
    try {
        const dataView = new DataView(arrayBuffer);
        
        if (arrayBuffer.byteLength < 12) {
            throw new Error('File too small to be a valid font');
        }
        
        const numTables = dataView.getUint16(4, false);
        const tableNames = [];
        let fvarOffset = null;
        
        for (let i = 0; i < numTables; i++) {
            const tableOffset = 12 + i * 16;
            const tag = new Uint8Array(arrayBuffer, tableOffset, 4);
            const tableTag = String.fromCharCode(tag[0], tag[1], tag[2], tag[3]);
            tableNames.push(tableTag);
            
            if (tableTag === 'fvar') {
                fvarOffset = dataView.getUint32(tableOffset + 8, false);
            }
        }
        
        if (fvarOffset === null) {
            throw new Error('No fvar table found. This may not be a variable font.');
        }
        
        const firstAxisRecordOffset = dataView.getUint16(fvarOffset + 4, false);
        const axisCount = dataView.getUint16(fvarOffset + 8, false);
        const axisSize = dataView.getUint16(fvarOffset + 10, false);
        
        const axes = [];
        const axisNames = {
            'wght': 'Weight',
            'wdth': 'Width',
            'opsz': 'Optical Size',
            'ital': 'Italic',
            'slnt': 'Slant',
            'GRAD': 'Grade',
            'XOPQ': 'X Opaque',
            'YOPQ': 'Y Opaque',
            'XTRA': 'Extra',
            'YTRA': 'Y Transparent',
            'YTLC': 'Y Transparent Lowercase',
            'YTUC': 'Y Transparent Uppercase',
            'YTFI': 'Y Transparent Figures',
            'YTDE': 'Y Transparent Denominator',
            'YTNUM': 'Y Transparent Numerator'
        };
        
        for (let i = 0; i < axisCount; i++) {
            const axisRecordOffset = fvarOffset + firstAxisRecordOffset + i * axisSize;
            const tagBytes = new Uint8Array(arrayBuffer, axisRecordOffset, 4);
            const axisTag = String.fromCharCode(tagBytes[0], tagBytes[1], tagBytes[2], tagBytes[3]);
            
            const minValue = dataView.getInt32(axisRecordOffset + 4, false) / 65536;
            const defaultValue = dataView.getInt32(axisRecordOffset + 8, false) / 65536;
            const maxValue = dataView.getInt32(axisRecordOffset + 12, false) / 65536;
            
            axes.push({
                tag: axisTag,
                name: axisNames[axisTag] || axisTag,
                min: Math.round(minValue),
                default: Math.round(defaultValue),
                max: Math.round(maxValue)
            });
        }
        
        fontAxes = axes;
        
        // Only reset axisValues on new font load, preserve on refresh
        if (!isRefresh) {
            axisValues = {};
            fontAxes.forEach(axis => {
                axisValues[axis.tag] = axis.default;
            });
        }
        // On refresh: fontAxes is updated but axisValues are preserved from previous state
        
        if (fontAxes.length === 0) {
            throw new Error('No axes found in fvar table');
        }
        
    } catch (error) {
        showError('Could not parse font axes: ' + error.message);
        fontAxes = [];
        axisValues = {};
    }
}

/**
 * Render OpenType features as toggleable pills
 */
function renderFeatures() {
    const featureContainer = document.getElementById('featuresContainer');
    if (!featureContainer) return;
    
    const featureTags = Object.keys(fontFeatures).sort();
    
    // Hide container if no features
    if (featureTags.length === 0) {
        featureContainer.style.display = 'none';
        featureContainer.innerHTML = '';
        return;
    }
    
    // Show container if features exist
    featureContainer.style.display = 'flex';
    featureContainer.innerHTML = '';
    
    featureTags.forEach(tag => {
        const button = document.createElement('button');
        button.className = 'feature-pill';
        button.textContent = tag;
        button.dataset.feature = tag;
        button.title = `Toggle ${tag} feature`;
        
        if (enabledFeatures[tag]) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            enabledFeatures[tag] = !enabledFeatures[tag];
            button.classList.toggle('active');
            updatePreview();
        });
        
        featureContainer.appendChild(button);
    });
}

/**
 * Render font axis controls
 */
function renderControls() {
    controlsContainer.innerHTML = '';

    if (fontAxes.length === 0) return;

    // Font Size Control
    const sizeSection = document.createElement('div');
    sizeSection.className = 'control-section';
    sizeSection.innerHTML = `
        <div class="control-section-title">Font Size</div>
        <div class="control-item">
            <div class="control-header">
                <span class="control-label">Size</span>
                <span class="control-value" id="sizeValue">${fontSize}px</span>
            </div>
            <input type="range" id="fontSizeSlider" min="12" max="1000" value="${fontSize}" step="1">
        </div>
    `;
    controlsContainer.appendChild(sizeSection);

    document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
        fontSize = parseInt(e.target.value);
        document.getElementById('sizeValue').textContent = `${fontSize}px`;
        updatePreview();
    });

    // Axes Controls
    if (fontAxes.length > 0) {
        const axesSection = document.createElement('div');
        axesSection.className = 'control-section';
        
        const axesTitle = document.createElement('div');
        axesTitle.className = 'control-section-title';
        axesTitle.textContent = 'Variable Axes';
        axesSection.appendChild(axesTitle);

        fontAxes.forEach((axis, index) => {
            const axisItem = document.createElement('div');
            axisItem.className = 'control-item';

            const axisHeader = document.createElement('div');
            axisHeader.className = 'control-header';

            axisHeader.innerHTML = `
                <span class="control-label">${axis.name}</span>
                <span class="control-value" data-axis-value="${axis.tag}">${axisValues[axis.tag]}</span>
                <button class="play-button" data-axis-index="${index}" title="Animate this axis">play_circle</button>
            `;

            const sliderWrapper = document.createElement('div');
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'axis-slider';
            slider.dataset.axis = axis.tag;
            slider.min = axis.min;
            slider.max = axis.max;
            slider.value = axisValues[axis.tag];
            slider.step = 1;

            slider.addEventListener('input', (e) => {
                const axis = e.target.dataset.axis;
                const value = parseInt(e.target.value);
                axisValues[axis] = value;
                document.querySelector(`[data-axis-value="${axis}"]`).textContent = value;
                updatePreview();
                
                if (isPlaying) {
                    stopAnimation();
                }
            });

            sliderWrapper.appendChild(slider);
            axisItem.appendChild(axisHeader);
            axisItem.appendChild(sliderWrapper);
            axesSection.appendChild(axisItem);
        });

        controlsContainer.appendChild(axesSection);

        document.querySelectorAll('.play-button').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                playingAxisIndex = parseInt(e.target.dataset.axisIndex);
                toggleAnimation();
            });
        });
    }
}

/**
 * Update preview text with current font and axis values
 */
function updatePreview() {
    if (!currentFont) return;

    const fontVariationSettings = fontAxes
        .map(axis => `"${axis.tag}" ${axisValues[axis.tag]}`)
        .join(', ');
    
    const fontFeatureSettings = Object.keys(enabledFeatures)
        .map(tag => `"${tag}" ${enabledFeatures[tag] ? 1 : 0}`)
        .join(', ');

    preview.style.fontFamily = currentFont.family;
    preview.style.fontSize = `${fontSize}px`;
    preview.style.fontVariationSettings = fontVariationSettings;
    if (fontFeatureSettings) {
        preview.style.fontFeatureSettings = fontFeatureSettings;
    }
}

/**
 * Toggle animation for current axis
 */
function toggleAnimation() {
    if (isPlaying) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

/**
 * Start animating the current axis
 */
function startAnimation() {
    isPlaying = true;
    playStartTime = performance.now();

    const playBtn = document.querySelector(`[data-axis-index="${playingAxisIndex}"]`);
    if (playBtn) {
        playBtn.classList.add('playing');
        playBtn.textContent = 'pause_circle';
    }

    const axis = fontAxes[playingAxisIndex];
    const slider = document.querySelector(`[data-axis="${axis.tag}"]`);

    const animate = (currentTime) => {
        const elapsed = currentTime - playStartTime;
        const cycle = 4000;
        const progress = (elapsed % cycle) / cycle;
        
        const range = axis.max - axis.min;
        const value = axis.min + range * Math.sin(progress * Math.PI * 2) * 0.5 + range * 0.5;
        
        axisValues[axis.tag] = Math.round(value);
        slider.value = axisValues[axis.tag];
        document.querySelector(`[data-axis-value="${axis.tag}"]`).textContent = axisValues[axis.tag];
        
        updatePreview();

        if (isPlaying) {
            animationId = requestAnimationFrame(animate);
        }
    };

    animationId = requestAnimationFrame(animate);
}

/**
 * Stop animating the current axis
 */
function stopAnimation() {
    isPlaying = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    const playBtn = document.querySelector(`[data-axis-index="${playingAxisIndex}"]`);
    if (playBtn) {
        playBtn.classList.remove('playing');
        playBtn.textContent = 'play_circle';
    }
}

/**
 * Display error or success message
 */
function showError(message, isSuccess = false) {
    const className = isSuccess ? 'success' : 'error';
    const icon = isSuccess ? '✓' : '⚠️';
    errorContainer.innerHTML = `<div class="${className}">${icon} ${message}</div>`;
    
    if (isSuccess) {
        setTimeout(() => {
            errorContainer.innerHTML = '';
        }, 2000);
    }
}
