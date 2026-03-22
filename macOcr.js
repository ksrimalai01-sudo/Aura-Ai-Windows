// macOcr.js - Tesseract.js Fallback Driver
import { createWorker } from 'tesseract.js';

export async function init() {
    // Initialize worker with multi-language support (EN, TH, JP)
    const worker = await createWorker(['eng', 'tha', 'jpn']);
    
    return {
        async recognize(imageData) {
            const { data: { text, confidence } } = await worker.recognize(imageData);
            return {
                text: text || '',
                confidence: confidence || 0
            };
        }
    };
}
