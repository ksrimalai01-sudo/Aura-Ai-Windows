// ocrMain.js - Main Process OCR Controller
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

let _engine = null;

async function initOcr() {
    if (process.platform === 'win32') {
        try {
            const windowsOcr = require('./windowsOcrMain.js');
            _engine = await windowsOcr.init();
            console.log("OCR Engine (Main): Windows Native Initialized");
        } catch (e) {
            console.warn("OCR Engine (Main): Windows Native failed, falling back to Tesseract.", e);
            const macOcr = require('./macOcrMain.js');
            _engine = await macOcr.init();
        }
    } else {
        const macOcr = require('./macOcrMain.js');
        _engine = await macOcr.init();
        console.log("OCR Engine (Main): Tesseract Initialized");
    }
}

async function recognize(dataUrl) {
    if (!_engine) await initOcr();

    // Convert DataURL to Buffer
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    return await _engine.recognize(buffer);
}

module.exports = { initOcr, recognize };
