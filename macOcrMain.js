// macOcrMain.js - Tesseract Fallback (Main Process)
const { createWorker } = require('tesseract.js');

async function init() {
    const worker = await createWorker(['eng', 'tha', 'jpn']);
    
    return {
        async recognize(imageBuffer) {
            const { data: { text, confidence } } = await worker.recognize(imageBuffer);
            return {
                text: text || '',
                confidence: confidence || 0
            };
        }
    };
}

module.exports = { init };
