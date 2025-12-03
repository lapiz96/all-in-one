# 🤖 AI Models Integration Guide

This guide shows how to integrate **real AI models** for production use. Currently, the platform uses simulations.

---

## 📦 Required AI Models

### 1. Real-ESRGAN (Image Enhancement)
### 2. RMBG 2.0 (Background Removal)
### 3. FFmpeg.wasm (File Conversion)
### 4. Whisper.cpp (Speech-to-Text)

---

## 🎨 Part 1: Real-ESRGAN Integration

### Download Model

```bash
# Create models directory
mkdir models
cd models

# Download Real-ESRGAN ONNX model (option 1)
# From: https://github.com/xinntao/Real-ESRGAN
wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.onnx

# OR use converted model for web
# https://huggingface.co/models?search=esrgan
```

### Install ONNX Runtime Web

```bash
npm install onnxruntime-web
```

### Update `worker.js`

Uncomment and update the ESRGAN loading code:

```javascript
import * as ort from 'onnxruntime-web';

async function loadESRGAN() {
    try {
        // Set WASM paths
        ort.env.wasm.wasmPaths = {
            'ort-wasm.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm.wasm',
            'ort-wasm-simd.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd.wasm',
            'ort-wasm-threaded.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-threaded.wasm'
        };

        // Try WebGPU first, fallback to WASM
        models.esrgan = await ort.InferenceSession.create('/models/realesrgan.onnx', {
            executionProviders: ['webgpu', 'wasm']
        });
        
        console.log('Real-ESRGAN loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load Real-ESRGAN:', error);
        return false;
    }
}

async function enhanceImage(imageData, width, height) {
    if (!models.esrgan) {
        throw new Error('ESRGAN model not loaded');
    }
    
    // Prepare input tensor (normalize to 0-1)
    const inputData = new Float32Array(width * height * 3);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const idx = i / 4;
        inputData[idx] = imageData.data[i] / 255.0;         // R
        inputData[idx + 1] = imageData.data[i + 1] / 255.0; // G
        inputData[idx + 2] = imageData.data[i + 2] / 255.0; // B
    }
    
    // Create tensor [1, 3, height, width]
    const tensor = new ort.Tensor('float32', inputData, [1, 3, height, width]);
    
    // Run inference
    const results = await models.esrgan.run({ input: tensor });
    
    // Get output
    const output = results.output;
    const outputData = output.data;
    
    // Convert back to ImageData (denormalize)
    const outputWidth = width * 4; // Real-ESRGAN typically upscales 4x
    const outputHeight = height * 4;
    const canvas = new OffscreenCanvas(outputWidth, outputHeight);
    const ctx = canvas.getContext('2d');
    const imageDataOut = ctx.createImageData(outputWidth, outputHeight);
    
    for (let i = 0; i < outputData.length; i += 3) {
        const idx = i / 3;
        imageDataOut.data[idx * 4] = Math.min(255, Math.max(0, outputData[i] * 255));       // R
        imageDataOut.data[idx * 4 + 1] = Math.min(255, Math.max(0, outputData[i + 1] * 255)); // G
        imageDataOut.data[idx * 4 + 2] = Math.min(255, Math.max(0, outputData[i + 2] * 255)); // B
        imageDataOut.data[idx * 4 + 3] = 255; // A
    }
    
    return imageDataOut;
}
```

---

## 🎭 Part 2: RMBG 2.0 Integration

### Download Model

```bash
cd models

# Download RMBG 2.0
# From: https://huggingface.co/briaai/RMBG-2.0
wget https://huggingface.co/briaai/RMBG-2.0/resolve/main/onnx/model.onnx -O rmbg-2.0.onnx
```

### Update `worker.js`

```javascript
async function loadRMBG() {
    try {
        models.rmbg = await ort.InferenceSession.create('/models/rmbg-2.0.onnx', {
            executionProviders: ['webgpu', 'wasm']
        });
        
        console.log('RMBG 2.0 loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load RMBG:', error);
        return false;
    }
}

async function removeBackground(imageData, width, height) {
    if (!models.rmbg) {
        throw new Error('RMBG model not loaded');
    }
    
    // Preprocess image
    const inputData = preprocessForRMBG(imageData, width, height);
    const tensor = new ort.Tensor('float32', inputData, [1, 3, 1024, 1024]);
    
    // Run inference
    const results = await models.rmbg.run({ input: tensor });
    
    // Get mask
    const mask = results.output.data;
    
    // Apply mask to original image
    const outputData = applyMask(imageData, mask, width, height);
    
    return outputData;
}

function preprocessForRMBG(imageData, width, height) {
    // RMBG expects 1024x1024 input
    const targetSize = 1024;
    const canvas = new OffscreenCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d');
    
    // Create temp canvas with original image
    const tempCanvas = new OffscreenCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    // Resize to 1024x1024
    ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize);
    const resized = ctx.getImageData(0, 0, targetSize, targetSize);
    
    // Normalize
    const normalized = new Float32Array(targetSize * targetSize * 3);
    for (let i = 0; i < resized.data.length; i += 4) {
        const idx = i / 4;
        normalized[idx] = (resized.data[i] / 255.0 - 0.485) / 0.229;
        normalized[idx + 1] = (resized.data[i + 1] / 255.0 - 0.456) / 0.224;
        normalized[idx + 2] = (resized.data[i + 2] / 255.0 - 0.406) / 0.225;
    }
    
    return normalized;
}

function applyMask(imageData, mask, width, height) {
    const output = new ImageData(width, height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
        const idx = i / 4;
        const maskValue = mask[idx];
        
        output.data[i] = imageData.data[i];       // R
        output.data[i + 1] = imageData.data[i + 1]; // G
        output.data[i + 2] = imageData.data[i + 2]; // B
        output.data[i + 3] = Math.min(255, maskValue * 255); // A (alpha from mask)
    }
    
    return output;
}
```

---

## 🎬 Part 3: FFmpeg.wasm Integration

### Install FFmpeg.wasm

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

### Update `worker.js`

```javascript
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

async function loadFFmpeg() {
    try {
        models.ffmpeg = new FFmpeg();
        
        // Set logger
        models.ffmpeg.on('log', ({ message }) => {
            console.log(message);
        });
        
        // Set progress handler
        models.ffmpeg.on('progress', ({ progress }) => {
            self.postMessage({
                type: 'progress',
                data: { percent: progress * 100, status: 'Converting...' }
            });
        });
        
        // Load FFmpeg
        await models.ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
        });
        
        console.log('FFmpeg loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        return false;
    }
}

async function convertWithFFmpeg(file, inputFormat, outputFormat) {
    if (!models.ffmpeg) {
        throw new Error('FFmpeg not loaded');
    }
    
    const inputFileName = `input.${inputFormat}`;
    const outputFileName = `output.${outputFormat}`;
    
    // Write input file to FFmpeg filesystem
    await models.ffmpeg.writeFile(inputFileName, await fetchFile(file));
    
    // Run conversion based on formats
    if (outputFormat === 'mp3') {
        // Video to audio
        await models.ffmpeg.exec(['-i', inputFileName, '-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k', outputFileName]);
    } else if (outputFormat === 'pdf') {
        // Image to PDF
        await models.ffmpeg.exec(['-i', inputFileName, '-f', 'pdf', outputFileName]);
    } else {
        // Generic conversion
        await models.ffmpeg.exec(['-i', inputFileName, outputFileName]);
    }
    
    // Read output file
    const data = await models.ffmpeg.readFile(outputFileName);
    
    // Clean up
    await models.ffmpeg.deleteFile(inputFileName);
    await models.ffmpeg.deleteFile(outputFileName);
    
    return data;
}
```

---

## 🎤 Part 4: Whisper.cpp Integration

### Option A: Use Whisper Web (Recommended)

```bash
npm install @xenova/transformers
```

### Update `worker.js`

```javascript
import { pipeline } from '@xenova/transformers';

let whisperPipeline = null;

async function loadWhisper() {
    try {
        // Load whisper model
        whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
        
        console.log('Whisper loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load Whisper:', error);
        return false;
    }
}

async function transcribeAudio(audioBlob) {
    if (!whisperPipeline) {
        throw new Error('Whisper not loaded');
    }
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Transcribe
    const result = await whisperPipeline(arrayBuffer);
    
    return result.text;
}
```

### Option B: Use Whisper.cpp WASM (More complex, better quality)

Download from: https://github.com/ggerganov/whisper.cpp

```bash
# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp

# Build for web
emcc -I. -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_whisper_init", "_whisper_full"]' whisper.cpp -o whisper.js

# Download model
bash ./models/download-ggml-model.sh base.en
```

---

## 🔧 Part 5: ImageMagick WASM (Format Conversion)

### Install

```bash
npm install @imagemagick/magick-wasm
```

### Usage

```javascript
import { ImageMagick, initializeImageMagick } from '@imagemagick/magick-wasm';

async function convertImageFormat(imageData, outputFormat) {
    await initializeImageMagick();
    
    const result = await ImageMagick.read(imageData, (image) => {
        image.quality = 95;
        
        switch (outputFormat) {
            case 'jpg':
            case 'jpeg':
                return image.write(MagickFormat.Jpeg, data => data);
            case 'png':
                return image.write(MagickFormat.Png, data => data);
            case 'webp':
                return image.write(MagickFormat.WebP, data => data);
            case 'pdf':
                return image.write(MagickFormat.Pdf, data => data);
            default:
                throw new Error('Unsupported format');
        }
    });
    
    return result;
}
```

---

## ⚡ Part 6: Optimization Tips

### 1. Lazy Loading

Load models only when needed:

```javascript
let modelCache = {};

async function getModel(modelName) {
    if (modelCache[modelName]) {
        return modelCache[modelName];
    }
    
    // Load model
    const model = await loadModel(modelName);
    modelCache[modelName] = model;
    
    return model;
}
```

### 2. Model Quantization

Use quantized models for smaller size:
- INT8 quantization (4x smaller)
- Float16 (2x smaller)

### 3. Progressive Loading

Show UI first, load models in background:

```javascript
// In app.js
document.addEventListener('DOMContentLoaded', async () => {
    // Show UI immediately
    initUI();
    
    // Load models in background
    await preloadModels();
});
```

### 4. WebGPU Detection

```javascript
async function detectWebGPU() {
    if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to WASM');
        return false;
    }
    
    try {
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        return true;
    } catch {
        return false;
    }
}
```

---

## 📊 Part 7: Performance Benchmarks

Expected performance:

| Task | WebGPU | WASM | Size |
|------|--------|------|------|
| Real-ESRGAN (512x512) | ~2s | ~8s | 17MB |
| RMBG 2.0 (1024x1024) | ~1s | ~4s | 176MB |
| FFmpeg (1min video) | ~5s | ~15s | 31MB |
| Whisper (1min audio) | ~3s | ~10s | 75MB |

---

## 🚀 Part 8: Deployment with Models

### Vercel Setup

Due to file size limits (100MB on free tier), use external CDN:

```javascript
// Use CDN for models
const MODEL_CDN = 'https://cdn.yoursite.com/models/';

async function loadModel(modelName) {
    const url = MODEL_CDN + modelName + '.onnx';
    const session = await ort.InferenceSession.create(url);
    return session;
}
```

### Use Cloudflare R2 for Models

1. Sign up: https://dash.cloudflare.com/
2. Create R2 bucket
3. Upload models
4. Configure CORS
5. Get public URL

---

## ✅ Testing Models

```javascript
// Test Real-ESRGAN
async function testESRGAN() {
    const testImage = new ImageData(512, 512);
    const result = await enhanceImage(testImage, 512, 512);
    console.log('ESRGAN test:', result.width === 2048);
}

// Test RMBG
async function testRMBG() {
    const testImage = new ImageData(512, 512);
    const result = await removeBackground(testImage, 512, 512);
    console.log('RMBG test:', result !== null);
}
```

---

## 📝 Notes

1. **Model Licensing**: Check each model's license before commercial use
2. **File Size**: Total models ~300MB - implement lazy loading
3. **Browser Support**: WebGPU requires Chrome 113+ or Edge 113+
4. **Fallback**: Always provide WASM fallback for older browsers

---

## 🔗 Resources

- Real-ESRGAN: https://github.com/xinntao/Real-ESRGAN
- RMBG 2.0: https://huggingface.co/briaai/RMBG-2.0
- ONNX Runtime Web: https://onnxruntime.ai/docs/tutorials/web/
- FFmpeg.wasm: https://ffmpegwasm.netlify.app/
- Whisper.cpp: https://github.com/ggerganov/whisper.cpp
- Transformers.js: https://huggingface.co/docs/transformers.js

---

**Ready for Production Integration!** 🎉
