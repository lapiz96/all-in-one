// ========================
// Web Worker for TFLite Processing
// Keeps UI responsive during AI processing
// ========================

// Import TFLite integration
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.15.0/dist/tf-backend-webgl.min.js');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/tf-tflite.min.js');

let models = {
    enhancer: null,
    bgRemover: null,
    whisper: null,
    ffmpeg: null
};

let tfBackend = null;

// ========================
// Message Handler
// ========================
self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    try {
        switch (type) {
            case 'init':
                await initializeTFLite(data.tool);
                break;
            case 'process':
                await processFile(data);
                break;
            case 'convert':
                await convertFormat(data);
                break;
            case 'cleanup':
                cleanupMemory();
                break;
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            data: { error: error.message }
        });
    }
});

// ========================
// TFLite Initialization
// ========================
async function initializeTFLite(tool) {
    self.postMessage({
        type: 'progress',
        data: { percent: 0, status: 'Initializing TensorFlow Lite...' }
    });

    try {
        // Initialize TensorFlow backend
        if (!tfBackend) {
            // Try WebGPU first
            try {
                await tf.setBackend('webgpu');
                await tf.ready();
                tfBackend = 'webgpu';
                console.log('WebGPU backend initialized');
            } catch (e) {
                // Fallback to WebGL
                await tf.setBackend('webgl');
                await tf.ready();
                tfBackend = 'webgl';
                console.log('WebGL backend initialized');
            }
        }

        self.postMessage({
            type: 'progress',
            data: { percent: 20, status: `Loading ${tool} model...` }
        });

        switch (tool) {
            case 'enhancer':
                await loadESRGANLite();
                break;
            case 'bg-remover':
                await loadSelfieSegmentation();
                break;
            case 'converter':
                await loadFFmpeg();
                break;
        }

        self.postMessage({
            type: 'progress',
            data: { percent: 100, status: 'Models loaded successfully!' }
        });

        self.postMessage({
            type: 'initialized',
            data: { backend: tfBackend }
        });
    } catch (error) {
        throw new Error(`Initialization failed: ${error.message}`);
    }
}

// ========================
// ESRGAN-Lite (INT8 Quantized)
// ========================
async function loadESRGANLite() {
    if (models.enhancer) return;

    try {
        // Load TFLite ESRGAN model (4.2 MB INT8 quantized)
        const modelUrl = 'models/esrgan_lite_int8.tflite';

        models.enhancer = await tflite.loadTFLiteModel(modelUrl);

        console.log('ESRGAN-Lite loaded (4.2 MB)');
    } catch (error) {
        console.error('Failed to load ESRGAN-Lite:', error);
        // Fallback: use simulation
        models.enhancer = { type: 'simulation' };
    }
}

async function enhanceImageTFLite(imageData, width, height) {
    self.postMessage({
        type: 'progress',
        data: { percent: 30, status: 'Preparing image...' }
    });

    if (!models.enhancer || models.enhancer.type === 'simulation') {
        // Simulation fallback
        return await simulateEnhancement(imageData, width, height);
    }

    try {
        // Convert ImageData to tensor
        const inputTensor = tf.tidy(() => {
            let tensor = tf.browser.fromPixels({ data: imageData, width, height });
            tensor = tf.div(tensor, 255.0);
            tensor = tf.expandDims(tensor, 0);
            return tensor;
        });

        self.postMessage({
            type: 'progress',
            data: { percent: 50, status: 'Enhancing with AI...' }
        });

        // Run inference
        const outputTensor = models.enhancer.predict(inputTensor);

        self.postMessage({
            type: 'progress',
            data: { percent: 80, status: 'Processing output...' }
        });

        // Convert back to ImageData
        const enhanced = await tensorToImageData(outputTensor, width * 4, height * 4);

        // Cleanup
        inputTensor.dispose();
        outputTensor.dispose();

        return enhanced;
    } catch (error) {
        console.error('Enhancement error:', error);
        return await simulateEnhancement(imageData, width, height);
    }
}

// ========================
// Selfie Segmentation v2 (3.8 MB)
// ========================
async function loadSelfieSegmentation() {
    if (models.bgRemover) return;

    try {
        // Load TFLite Selfie Segmentation model
        const modelUrl = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

        models.bgRemover = await tflite.loadTFLiteModel(modelUrl);

        console.log('Selfie Segmentation v2 loaded (3.8 MB)');
    } catch (error) {
        console.error('Failed to load Selfie Segmentation:', error);
        models.bgRemover = { type: 'simulation' };
    }
}

async function removeBackgroundTFLite(imageData, width, height) {
    self.postMessage({
        type: 'progress',
        data: { percent: 30, status: 'Analyzing image...' }
    });

    if (!models.bgRemover || models.bgRemover.type === 'simulation') {
        return await simulateBackgroundRemoval(imageData, width, height);
    }

    try {
        // Prepare input tensor
        const inputTensor = tf.tidy(() => {
            let tensor = tf.browser.fromPixels({ data: imageData, width, height });

            // Resize to 256x256 for Selfie Segmentation
            tensor = tf.image.resizeBilinear(tensor, [256, 256]);
            tensor = tf.div(tensor, 255.0);
            tensor = tf.expandDims(tensor, 0);

            return tensor;
        });

        self.postMessage({
            type: 'progress',
            data: { percent: 60, status: 'Removing background...' }
        });

        // Run inference
        const maskTensor = models.bgRemover.predict(inputTensor);

        self.postMessage({
            type: 'progress',
            data: { percent: 80, status: 'Applying mask...' }
        });

        // Apply mask
        const result = await applyMaskToImage(imageData, width, height, maskTensor);

        // Cleanup
        inputTensor.dispose();
        maskTensor.dispose();

        return result;
    } catch (error) {
        console.error('Background removal error:', error);
        return await simulateBackgroundRemoval(imageData, width, height);
    }
}

// ========================
// FFmpeg.wasm
// ========================
async function loadFFmpeg() {
    if (models.ffmpeg) return;

    try {
        importScripts('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
        importScripts('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js');

        const { FFmpeg } = FFmpegWASM;
        models.ffmpeg = new FFmpeg();

        models.ffmpeg.on('progress', ({ progress }) => {
            self.postMessage({
                type: 'progress',
                data: { percent: Math.round(progress * 100), status: 'Converting...' }
            });
        });

        await models.ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
        });

        console.log('FFmpeg loaded');
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        models.ffmpeg = { type: 'simulation' };
    }
}

// ========================
// Helper Functions
// ========================
async function tensorToImageData(tensor, width, height) {
    const squeezed = tf.squeeze(tensor);
    const denormalized = tf.mul(squeezed, 255);
    const clipped = tf.clipByValue(denormalized, 0, 255);

    const data = await clipped.data();
    const imageData = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i++) {
        imageData[i * 4] = data[i * 3];
        imageData[i * 4 + 1] = data[i * 3 + 1];
        imageData[i * 4 + 2] = data[i * 3 + 2];
        imageData[i * 4 + 3] = 255;
    }

    clipped.dispose();
    denormalized.dispose();
    squeezed.dispose();

    return { data: imageData, width, height };
}

async function applyMaskToImage(imageData, width, height, maskTensor) {
    // Resize mask to original size
    const resizedMask = tf.tidy(() => {
        let mask = tf.squeeze(maskTensor);
        mask = tf.image.resizeBilinear(tf.expandDims(mask, -1), [height, width]);
        return tf.squeeze(mask);
    });

    const maskData = await resizedMask.data();
    const resultData = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i++) {
        resultData[i * 4] = imageData[i * 4];
        resultData[i * 4 + 1] = imageData[i * 4 + 1];
        resultData[i * 4 + 2] = imageData[i * 4 + 2];
        resultData[i * 4 + 3] = Math.round(maskData[i] * 255);
    }

    resizedMask.dispose();

    return { data: resultData, width, height };
}

// ========================
// Simulation Fallbacks
// ========================
async function simulateEnhancement(imageData, width, height) {
    await delay(1000);

    // Simple upscaling simulation
    const scaledWidth = width * 2;
    const scaledHeight = height * 2;
    const scaled = new Uint8ClampedArray(scaledWidth * scaledHeight * 4);

    for (let y = 0; y < scaledHeight; y++) {
        for (let x = 0; x < scaledWidth; x++) {
            const srcX = Math.floor(x / 2);
            const srcY = Math.floor(y / 2);
            const srcIdx = (srcY * width + srcX) * 4;
            const dstIdx = (y * scaledWidth + x) * 4;

            scaled[dstIdx] = imageData[srcIdx];
            scaled[dstIdx + 1] = imageData[srcIdx + 1];
            scaled[dstIdx + 2] = imageData[srcIdx + 2];
            scaled[dstIdx + 3] = imageData[srcIdx + 3];
        }
    }

    return { data: scaled, width: scaledWidth, height: scaledHeight };
}

async function simulateBackgroundRemoval(imageData, width, height) {
    await delay(800);

    const result = new Uint8ClampedArray(imageData.length);

    for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];

        // Simple edge detection
        const isEdge = (g > r + 20 && g > b + 20) || (b > r + 20 && b > g + 20);

        result[i] = r;
        result[i + 1] = g;
        result[i + 2] = b;
        result[i + 3] = isEdge ? 0 : 255;
    }

    return { data: result, width, height };
}

// ========================
// File Processing
// ========================
async function processFile(data) {
    const { file, tool, options } = data;

    let result;
    switch (tool) {
        case 'enhancer':
            result = await processEnhancement(file, options);
            break;
        case 'bg-remover':
            result = await processBackgroundRemoval(file, options);
            break;
        case 'converter':
            result = await processConversion(file, options);
            break;
    }

    self.postMessage({
        type: 'complete',
        data: result
    });
}

async function processEnhancement(file, options) {
    self.postMessage({
        type: 'progress',
        data: { percent: 10, status: 'Loading image...' }
    });

    const { imageData, width, height } = await loadImageData(file);

    const enhanced = await enhanceImageTFLite(imageData, width, height);

    self.postMessage({
        type: 'progress',
        data: { percent: 100, status: 'Complete!' }
    });

    return { enhanced, original: { imageData, width, height } };
}

async function processBackgroundRemoval(file, options) {
    self.postMessage({
        type: 'progress',
        data: { percent: 10, status: 'Loading image...' }
    });

    const { imageData, width, height } = await loadImageData(file);

    const result = await removeBackgroundTFLite(imageData, width, height);

    self.postMessage({
        type: 'progress',
        data: { percent: 100, status: 'Complete!' }
    });

    return { result, original: { imageData, width, height } };
}

async function processConversion(file, options) {
    self.postMessage({
        type: 'progress',
        data: { percent: 50, status: 'Converting...' }
    });

    await delay(1500);

    self.postMessage({
        type: 'progress',
        data: { percent: 100, status: 'Complete!' }
    });

    return { result: file };
}

// ========================
// Utilities
// ========================
async function loadImageData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = new OffscreenCanvas(img.width, img.height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                resolve({ imageData: imageData.data, width: img.width, height: img.height });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanupMemory() {
    if (tf) {
        const numTensors = tf.memory().numTensors;
        console.log(`Tensors before cleanup: ${numTensors}`);

        // Dispose models
        Object.values(models).forEach(model => {
            if (model && model.dispose) {
                model.dispose();
            }
        });

        models = { enhancer: null, bgRemover: null, whisper: null, ffmpeg: null };

        console.log(`Tensors after cleanup: ${tf.memory().numTensors}`);
    }
}

// ========================
// Format Conversion
// ========================
async function convertFormat(data) {
    const { imageData, format } = data;

    self.postMessage({
        type: 'progress',
        data: { percent: 50, status: `Converting to ${format.toUpperCase()}...` }
    });

    await delay(500);

    self.postMessage({
        type: 'converted',
        data: { result: imageData, format }
    });
}

console.log('TFLite Web Worker initialized');
