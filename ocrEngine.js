// ocrEngine.js - Modular OCR abstraction layer
const { platform } = process;

let _engine = null;

/**
 * Initializes the OCR engine based on the current platform.
 */
export async function initOcr() {
    if (platform === 'win32') {
        try {
            const { init } = await import('./windowsOcr.js');
            _engine = await init();
            console.log("OCR Engine: Windows Native Initialized");
        } catch (e) {
            console.warn("OCR Engine: Windows Native failed, falling back to Tesseract.", e);
            const { init } = await import('./macOcr.js');
            _engine = await init();
        }
    } else {
        const { init } = await import('./macOcr.js');
        _engine = await init();
        console.log("OCR Engine: Tesseract Fallback Initialized");
    }
}

/**
 * Performs OCR on the given image data.
 * @param {string|Buffer} imageData - Image data (URL or Buffer)
 * @returns {Promise<{text: string, confidence: number}>}
 */
export async function recognize(imageData) {
    if (!_engine) {
        console.warn("OCR Engine: Not initialized. Initializing now...");
        await initOcr();
    }
    return await _engine.recognize(imageData);
}
