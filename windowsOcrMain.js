// windowsOcrMain.js - Windows Native Driver (Main Process)
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const ocr = require('node-windows-ocr');

async function init() {
    return {
        async recognize(imageBuffer) {
            // node-windows-ocr requires a file path
            const tempFile = path.join(os.tmpdir(), `aura_ocr_${Date.now()}.png`);
            try {
                await fs.writeFile(tempFile, imageBuffer);
                const results = await ocr.recognizeBatchFromPath([tempFile]);
                
                // Cleanup
                await fs.unlink(tempFile).catch(() => {});

                if (results && results.length > 0) {
                    return {
                        text: results[0].Result.Text || '',
                        confidence: 0.95 // Native doesn't expose mean confidence clearly in this wrapper
                    };
                }
                return { text: '', confidence: 0 };
            } catch (e) {
                console.error("Windows OCR Error:", e);
                // Ensure cleanup even on error
                await fs.unlink(tempFile).catch(() => {});
                throw e;
            }
        }
    };
}

module.exports = { init };
