// windowsOcr.js - Windows Native (WinRT) Driver
let ocr = null;

export async function init() {
    try {
        // node-windows-ocr is an optional dependency
        ocr = await import('node-windows-ocr');
        return {
            async recognize(imageData) {
                // Windows Native OCR is extremely fast (~100-200ms)
                const result = await ocr.recognize(imageData);
                return {
                    text: result.text || '',
                    confidence: result.meanConfidence || 0
                };
            }
        };
    } catch (e) {
        console.error("Windows OCR Init Error:", e);
        throw e;
    }
}
