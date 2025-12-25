# Native Libraries for Deep Tree Echo

This directory contains pre-compiled native libraries for on-device AI inference and acceleration.

## Directory Structure

```
native-libs/
├── arm64-v8a/          # ARM64 Android libraries
│   ├── libllama.so     # LLaMA.cpp inference engine
│   ├── libggml*.so     # GGML tensor operations
│   ├── libQnn*.so      # Qualcomm NPU support
│   └── ...
└── README.md           # This file
```

## Library Categories

### Core AI/ML Inference

| Library | Description | Use Case |
|---------|-------------|----------|
| `libllama.so` | LLaMA.cpp inference | Local LLM inference |
| `libllama-jni.so` | LLaMA JNI bindings | Java/Kotlin integration |
| `libonnxruntime.so` | ONNX Runtime | Model inference |
| `libctranslate2.so` | CTranslate2 | Translation models |
| `libncnn.so` | NCNN inference | Lightweight neural networks |

### Tensor Operations (GGML)

| Library | Description | Use Case |
|---------|-------------|----------|
| `libggml.so` | Core GGML library | Tensor operations |
| `libggml-base.so` | Base operations | Foundation layer |
| `libggml-cpu.so` | CPU backend | CPU inference |
| `libggml-vulkan.so` | Vulkan backend | GPU inference |
| `libggml-opencl.so` | OpenCL backend | GPU inference |
| `libggml-blas.so` | BLAS operations | Linear algebra |

### GPU Acceleration

| Library | Description | Use Case |
|---------|-------------|----------|
| `libOpenCL.so` | OpenCL runtime | GPU compute |
| `libopenblas.so` | OpenBLAS | CPU linear algebra |
| `libomp.so` | OpenMP runtime | Parallel processing |

### Qualcomm NPU Support

| Library | Description | SoC Support |
|---------|-------------|-------------|
| `libQnnHtpV68Stub.so` | QNN HTP v68 | Snapdragon 8 Gen 1 |
| `libQnnHtpV69Stub.so` | QNN HTP v69 | Snapdragon 8+ Gen 1 |
| `libQnnHtpV73Stub.so` | QNN HTP v73 | Snapdragon 8 Gen 2 |
| `libQnnHtpV75Stub.so` | QNN HTP v75 | Snapdragon 8 Gen 3 |
| `libQnnHtpV79Stub.so` | QNN HTP v79 | Snapdragon 8 Elite |
| `liblaylaQNN.so` | Custom QNN layer | Layla integration |

### Speech & Audio

| Library | Description | Use Case |
|---------|-------------|----------|
| `libsherpa-onnx-jni.so` | Sherpa ONNX | Speech recognition/synthesis |
| `libpiper_phonemize.so` | Piper phonemizer | Text-to-speech |
| `libespeak-ng.so` | eSpeak NG | TTS fallback |
| `libkaldi-decoder-core.so` | Kaldi decoder | ASR decoding |
| `libkaldi-native-fbank-core.so` | Kaldi fbank | Audio features |

### Text Processing

| Library | Description | Use Case |
|---------|-------------|----------|
| `libsentencepiece.so` | SentencePiece | Tokenization |
| `libtokenizers-jni.so` | HuggingFace tokenizers | Tokenization |
| `libssentencepiece_core.so` | SentencePiece core | Tokenization |

### React Native Integration

| Library | Description | Use Case |
|---------|-------------|----------|
| `libhermes.so` | Hermes JS engine | RN runtime |
| `libjsi.so` | JSI interface | Native bridge |
| `libonnxruntimejsihelper.so` | ONNX JSI bridge | JS inference |
| `libreanimated.so` | Reanimated | Animations |

## Integration with Deep Tree Echo

### Triadic Cognitive Engine Enhancement

The native libraries enable local inference for the dove9 triadic cognitive engine:

1. **Stream 1 (Perception)**: Use `libonnxruntime.so` for vision/audio processing
2. **Stream 2 (Cognition)**: Use `libllama.so` for language understanding
3. **Stream 3 (Action)**: Use `libsherpa-onnx-jni.so` for speech synthesis

### NPU Acceleration

For Qualcomm devices, the QNN libraries provide hardware-accelerated inference:

```typescript
// Example: NPU-accelerated inference
import { LlamaCoprocessor } from '@deltecho/native';

const coprocessor = new LlamaCoprocessor({
  backend: 'qnn',
  device: 'htp', // Hexagon Tensor Processor
});
```

### Memory-Mapped I/O Interface

Following the child-agent-npu architecture:

```
PERIPH Region: 0x40001000
├── CMD Register (0x00)
├── STATUS Register (0x04)
├── CONFIG Register (0x08)
└── TELEMETRY Region (0x10-0x1F)

SRAM Region: 0x20000000
├── Prompt Buffer
├── KV Cache
└── Output Buffer
```

## Build Integration

### Android (React Native)

Add to `android/app/build.gradle`:

```gradle
android {
    sourceSets {
        main {
            jniLibs.srcDirs = ['../../native-libs']
        }
    }
}
```

### Electron (Desktop)

Native libraries can be loaded via Node.js native modules or WASM compilation.

## License

These libraries are compiled from various open-source projects:
- LLaMA.cpp: MIT License
- GGML: MIT License
- ONNX Runtime: MIT License
- Sherpa ONNX: Apache 2.0
- SentencePiece: Apache 2.0

---
*Last Updated: December 25, 2025*
