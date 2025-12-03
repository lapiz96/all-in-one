// ========================
// TensorFlow Lite Integration
// Ultra-light AI processing with TFLite models
// ========================

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-webgpu';
import * as tflite from '@tensorflow/tfjs-tflite';

// ========================
// Configuration
// ========================
const MODEL_CONFIG = {
    // CDN base URL for TFLite models (use your own CDN)
    CDN_BASE: 'https://cdn.yoursite.com/models/',

    enhancer: {
        name: 'esrgan_lite_int8.tflite',
        size: '4.2 MB',
        url: 'https://tfhub.dev/captain-pool/esrgan-tf2/1'
    },

    bgRemover: {
        name: 'selfie_segmentation_v2.tflite',
        size: '3.8 MB',
        url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'
    },

    whisper: {
        name: 'whisper_tiny_int8.tflite',
        size: '12 MB',
        url: 'models/whisper_tiny_int8.tflite'
    }
};

// ========================
// Model Cache
// ========================
class ModelCache {
    constructor() {
        this.models = new Map();
        this.loading = new Map();
    }

    async get(modelName) {
        if (this.models.has(modelName)) {
            return this.models.get(modelName);
        }

        if (this.loading.has(modelName)) {
            return this.loading.get(modelName);
        }

        const loadPromise = this.load(modelName);
        this.loading.set(modelName, loadPromise);

        try {
            const model = await loadPromise;
            this.models.set(modelName, model);
            this.loading.delete(modelName);
            return model;
        } catch (error) {
            this.loading.delete(modelName);
            throw error;
        }
    }

    async load(modelName) {
        const config = MODEL_CONFIG[modelName];
        if (!config) {
            throw new Error(`Unknown model: ${modelName}`);
        }

        console.log(`Loading TFLite model: ${config.name} (${config.size})`);

        // Load TFLite model
        const model = await tflite.loadTFLiteModel(config.url);

        console.log(`Model loaded: ${modelName}`);
        return model;
    }

    clear() {
        this.models.forEach(model => {
            if (model.dispose) {
                model.dispose();
            }
        });
        this.models.clear();
    }
}

const modelCache = new ModelCache();

// ========================
// Backend Initialization
// ========================
export async function initTFLite() {
    try {
        // Try WebGPU first (best performance)
        if (navigator.gpu) {
            console.log('Attempting WebGPU backend...');
            try {
                await tf.setBackend('webgpu');
                await tf.ready();
                console.log('✅ WebGPU backend initialized');
                return 'webgpu';
            } catch (e) {
                console.warn('WebGPU not available, falling back to WebGL');
            }
        }

        // Fallback to WebGL
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('✅ WebGL backend initialized');
        return 'webgl';
    } catch (error) {
        console.error('Failed to initialize TensorFlow:', error);
        throw error;
    }
}

// ========================
// Image Enhancement (ESRGAN-Lite)
// ========================
export async function enhanceImage(imageData, options = {}) {
    const {
        scale = 4,
        onProgress = () => { }
    } = options;

    onProgress(0, 'Loading ESRGAN-Lite model...');

    try {
        // Get model from cache
        const model = await modelCache.get('enhancer');

        onProgress(20, 'Preparing image...');

        // Convert ImageData to tensor
        const inputTensor = tf.tidy(() => {
            // Create tensor from image data
            let tensor = tf.browser.fromPixels(imageData);

            // Normalize to [0, 1]
            tensor = tf.div(tensor, 255.0);

            // Add batch dimension
            tensor = tf.expandDims(tensor, 0);

            return tensor;
        });

        onProgress(40, 'Enhancing image...');

        // Run inference
        const outputTensor = await model.predict(inputTensor);

        onProgress(70, 'Processing output...');

        // Convert output tensor back to ImageData
        const enhancedData = await tensorToImageData(outputTensor);

        // Clean up
        inputTensor.dispose();
        outputTensor.dispose();

        onProgress(100, 'Enhancement complete!');

        return enhancedData;
    } catch (error) {
        console.error('Enhancement error:', error);
        throw error;
    }
}

// ========================
// Background Removal (Selfie Segmentation v2)
// ========================
export async function removeBackground(imageData, options = {}) {
    const {
        onProgress = () => { }
    } = options;

    onProgress(0, 'Loading segmentation model...');

    try {
        // Get model from cache
        const model = await modelCache.get('bgRemover');

        onProgress(20, 'Preparing image...');

        // Convert to tensor
        const inputTensor = tf.tidy(() => {
            let tensor = tf.browser.fromPixels(imageData);

            // Resize to model input size (256x256 for Selfie Segmentation)
            tensor = tf.image.resizeBilinear(tensor, [256, 256]);

            // Normalize
            tensor = tf.div(tensor, 255.0);

            // Add batch dimension
            tensor = tf.expandDims(tensor, 0);

            return tensor;
        });

        onProgress(50, 'Detecting subject...');

        // Run inference
        const maskTensor = await model.predict(inputTensor);

        onProgress(70, 'Removing background...');

        // Apply mask to original image
        const resultData = await applySegmentationMask(imageData, maskTensor);

        // Clean up
        inputTensor.dispose();
        maskTensor.dispose();

        onProgress(100, 'Background removed!');

        return resultData;
    } catch (error) {
        console.error('Background removal error:', error);
        throw error;
    }
}

// ========================
// Audio Transcription (Whisper-Tiny TFLite)
// ========================
export async function transcribeAudio(audioData, options = {}) {
    const {
        language = 'en',
        onProgress = () => { }
    } = options;

    onProgress(0, 'Loading Whisper model...');

    try {
        const model = await modelCache.get('whisper');

        onProgress(30, 'Processing audio...');

        // Preprocess audio
        const inputTensor = preprocessAudio(audioData);

        onProgress(60, 'Transcribing...');

        // Run inference
        const outputTensor = await model.predict(inputTensor);

        onProgress(90, 'Decoding text...');

        // Decode output to text
        const transcription = await decodeWhisperOutput(outputTensor);

        // Clean up
        inputTensor.dispose();
        outputTensor.dispose();

        onProgress(100, 'Transcription complete!');

        return transcription;
    } catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
}

// ========================
// Helper Functions
// ========================

async function tensorToImageData(tensor) {
    // Remove batch dimension
    const squeezed = tf.squeeze(tensor);

    // Denormalize (multiply by 255)
    const denormalized = tf.mul(squeezed, 255);

    // Clip values to [0, 255]
    const clipped = tf.clipByValue(denormalized, 0, 255);

    // Convert to ImageData
    const [height, width] = clipped.shape;
    const data = await clipped.data();

    const imageData = new ImageData(width, height);

    for (let i = 0; i < width * height; i++) {
        imageData.data[i * 4] = data[i * 3];         // R
        imageData.data[i * 4 + 1] = data[i * 3 + 1]; // G
        imageData.data[i * 4 + 2] = data[i * 3 + 2]; // B
        imageData.data[i * 4 + 3] = 255;              // A
    }

    clipped.dispose();
    denormalized.dispose();
    squeezed.dispose();

    return imageData;
}

async function applySegmentationMask(imageData, maskTensor) {
    // Resize mask to match image size
    const [height, width] = [imageData.height, imageData.width];

    const resizedMask = tf.tidy(() => {
        // Remove batch dimension
        let mask = tf.squeeze(maskTensor);

        // Resize to original image size
        mask = tf.image.resizeBilinear(tf.expandDims(mask, -1), [height, width]);

        // Squeeze channel dimension
        mask = tf.squeeze(mask);

        return mask;
    });

    const maskData = await resizedMask.data();

    // Apply mask to image
    const resultData = new ImageData(width, height);

    for (let i = 0; i < width * height; i++) {
        const maskValue = maskData[i];

        resultData.data[i * 4] = imageData.data[i * 4];         // R
        resultData.data[i * 4 + 1] = imageData.data[i * 4 + 1]; // G
        resultData.data[i * 4 + 2] = imageData.data[i * 4 + 2]; // B
        resultData.data[i * 4 + 3] = Math.round(maskValue * 255); // A (alpha from mask)
    }

    resizedMask.dispose();

    return resultData;
}

function preprocessAudio(audioData) {
    // Convert audio to mel spectrogram
    // This is a simplified version - actual implementation would be more complex

    const sampleRate = 16000;
    const nMels = 80;

    // For now, return a placeholder tensor
    // In production, implement proper mel spectrogram conversion
    return tf.zeros([1, nMels, audioData.length / 512]);
}

async function decodeWhisperOutput(outputTensor) {
    // Decode Whisper output tokens to text
    // This is a simplified version

    const outputData = await outputTensor.data();

    // In production, implement proper token decoding with vocabulary
    return "Transcription result (implement proper decoding)";
}

// ========================
// Model Warming (Preload)
// ========================
export async function warmupModels(modelNames = []) {
    console.log('Warming up models...');

    const promises = modelNames.map(name => modelCache.get(name));

    try {
        await Promise.all(promises);
        console.log('Models warmed up successfully');
    } catch (error) {
        console.warn('Model warmup failed:', error);
    }
}

// ========================
// Memory Management
// ========================
export function clearModels() {
    modelCache.clear();

    // Clean up TensorFlow memory
    const numTensors = tf.memory().numTensors;
    console.log(`Cleared models. Remaining tensors: ${numTensors}`);
}

// ========================
// Performance Metrics
// ========================
export function getMemoryInfo() {
    return tf.memory();
}

export function getBackend() {
    return tf.getBackend();
}

// ========================
// Export Model Cache
// ========================
export { modelCache };
