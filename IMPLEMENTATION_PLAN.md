# AI File Naming SDK - Simplified Implementation Plan

## Overview

A **simple, local SDK** for intelligently naming files using GPT-5 with aggressive token optimization. This plan focuses on practical solutions that deliver 90%+ token savings without over-engineering.

**Key Goals:**
- 🎯 90-95% token reduction
- 💰 $0.10 → $0.001-0.005 per file
- ⚡ Process 50 files in <10 seconds
- 🔧 <5 minute integration time
- 📦 Minimal dependencies

---

## Core Philosophy

**Keep It Simple** - This is a local tool for developers, not enterprise software. We prioritize:
1. **Practical over perfect** - 90% accuracy is good enough
2. **Speed over complexity** - Fast implementation, fast execution
3. **Minimal dependencies** - Only what's essential
4. **Clear boundaries** - Know what we won't build

---

## What We're Building (5 Components Only)

### 1. ContentSampler
Extract just enough content to identify files accurately.

```typescript
class ContentSampler {
  constructor(config: {
    pdfWords?: number;      // Default: 500
    imageSize?: number;     // Default: 256px
    videoFrames?: number;   // Default: 2
    textChars?: number;     // Default: 500
  });

  async sample(filePath: string): Promise<{
    content: string;
    type: 'text' | 'image' | 'metadata';
    tokens: number;
  }>;
}
```

**Extraction Strategy:**
- **PDFs**: First 500 words using `pdf-parse`
- **Images**: Thumbnail (256px) + EXIF metadata
- **Videos**: 1-2 frames from first 10%
- **Documents**: First 500 characters
- **Others**: File metadata only

### 2. PromptOptimizer
Generate ultra-minimal prompts that get the job done.

```typescript
class PromptOptimizer {
  buildPrompt(context: {
    fileType: string;
    content: string;
    pattern?: string;  // For batch operations
  }): {
    prompt: string;
    tokens: number;
  };
}
```

**Prompt Examples:**
```typescript
// Before (200+ tokens):
"You are an AI assistant specialized in generating descriptive,
organized filenames based on file content and metadata..."

// After (20 tokens):
"Name this photo: sunset beach. Format: snake_case"

// With pattern (30 tokens):
"Apply pattern vacation_[n] to: beach photo. Next: 003"
```

### 3. BatchGrouper
Simple similarity detection for efficient batch processing.

```typescript
class BatchGrouper {
  group(files: string[]): FileGroup[];

  // Simple bucketing by:
  // - File type (image/video/document)
  // - Size range (<1MB, 1-10MB, >10MB)
  // - Directory location
  // - Date created (same day)
}
```

**No Complex Clustering** - Just practical grouping that reduces API calls by 80%.

### 4. MetadataExtractor
Zero-token naming for obvious cases.

```typescript
class MetadataExtractor {
  async canNameFromMetadata(file: string): Promise<{
    confidence: number;  // 0-1
    suggestedName?: string;
  }>;
}
```

**Handles:**
- Screenshots → `screenshot_2024_01_15_093042`
- Photos with GPS → `sunset_beach_miami_2024`
- Documents with titles → Extract from first line
- Downloads → Clean up existing names

### 5. SmartPipeline
Cost-aware processing with early exit.

```typescript
class SmartPipeline {
  async process(files: string[]): Promise<NamingResult[]> {
    // Stage 1: Try metadata (0 tokens)
    // Stage 2: Try GPT-5-mini (50 tokens)
    // Stage 3: Use GPT-5 (200 tokens)
  }
}
```

---

## What We're NOT Building

❌ **Complex ML/AI Features**
- No custom clustering algorithms
- No local ML models
- No computer vision processing
- No audio transcription

❌ **Enterprise Features**
- No distributed processing
- No database storage layer
- No monitoring/observability
- No A/B testing framework
- No multi-tenant support

❌ **Advanced Optimizations**
- No semantic deduplication
- No incremental learning
- No custom model training
- No edge deployment

---

## 7-Day Implementation Timeline

### Days 1-2: Core Content Extraction
**Goal:** Extract minimal representative content from files

**Tasks:**
1. Set up `pdf-parse` for PDF text extraction
2. Implement image thumbnail generation with `sharp`
3. Basic video frame extraction (ffmpeg wrapper)
4. Add EXIF extraction with `exifr`
5. Create unified ContentSampler class

**Deliverable:**
```typescript
const sampler = new ContentSampler();
const content = await sampler.sample('document.pdf');
// { content: "First 500 words...", type: "text", tokens: 125 }
```

### Days 3-4: Smart Prompting & GPT-5 Integration
**Goal:** Minimize tokens while maintaining quality

**Tasks:**
1. Create prompt templates for each file type
2. Implement GPT-5 integration with reasoning levels
3. Add response caching to avoid duplicate API calls
4. Build token estimation utilities

**Deliverable:**
```typescript
const optimizer = new PromptOptimizer();
const prompt = optimizer.buildPrompt({
  fileType: 'image',
  content: 'sunset over ocean'
});
// { prompt: "Name: sunset ocean. Format: snake_case", tokens: 12 }
```

### Day 5: Batch Processing
**Goal:** Handle similar files efficiently

**Tasks:**
1. Implement simple file grouping logic
2. Create pattern extraction from representative files
3. Add pattern application to similar files
4. Implement parallel processing

**Deliverable:**
```typescript
const grouper = new BatchGrouper();
const groups = grouper.group(['IMG_001.jpg', 'IMG_002.jpg']);
// Groups similar files for 80% token reduction
```

### Day 6: Pipeline Assembly
**Goal:** Wire everything together

**Tasks:**
1. Create the SmartPipeline orchestrator
2. Implement 3-stage processing with early exit
3. Add basic error handling and retries
4. Implement cost tracking

**Deliverable:**
```typescript
const pipeline = new SmartPipeline({ strategy: 'aggressive' });
const results = await pipeline.process(['file1.pdf', 'photo.jpg']);
// Automatically uses optimal strategy per file
```

### Day 7: Testing & Polish
**Goal:** Ensure it works reliably

**Tasks:**
1. Test with real file collections
2. Add simple CLI interface
3. Write usage documentation
4. Create example scripts
5. Performance optimization

**Deliverable:** Working SDK with CLI
```bash
npm install ai-file-naming
ai-rename --dir ./photos --strategy aggressive
```

---

## Token Optimization Breakdown

### Strategy & Impact

| Optimization | Token Reduction | Implementation |
|-------------|-----------------|----------------|
| **Content Sampling** | 60-80% | Extract only first 500 words/2 frames |
| **Minimal Prompts** | 40-50% | 20-50 token prompts vs 200+ |
| **Batch Patterns** | 70-90% | Apply patterns to similar files |
| **Metadata-First** | 100% | 30% of files need no API |
| **GPT-5 Efficiency** | 50% | Cheaper than GPT-4 per token |
| **Response Caching** | 20-30% | Avoid duplicate API calls |

### Real-World Examples

**Photo Batch (50 vacation photos):**
```
Traditional: 50 files × 800 tokens = 40,000 tokens ($1.00)
Optimized:   1 representative × 200 tokens + 49 patterns × 20 tokens = 1,180 tokens ($0.03)
Savings:     97% reduction
```

**Document Collection (20 PDFs):**
```
Traditional: 20 files × 1000 tokens = 20,000 tokens ($0.50)
Optimized:   8 metadata × 0 + 12 files × 100 tokens = 1,200 tokens ($0.03)
Savings:     94% reduction
```

---

## Configuration

### Three Simple Strategies

```typescript
// Aggressive - Maximum savings (95% reduction)
const aggressive = {
  strategy: 'aggressive',
  contentSampling: { pdfWords: 300, imageSize: 128 },
  promptMode: 'ultra-minimal',
  metadataFirst: true,
  maxTokensPerFile: 50
};

// Balanced - Good quality + savings (85% reduction)
const balanced = {
  strategy: 'balanced',
  contentSampling: { pdfWords: 500, imageSize: 256 },
  promptMode: 'minimal',
  metadataFirst: true,
  maxTokensPerFile: 150
};

// Quality - Best accuracy (60% reduction)
const quality = {
  strategy: 'quality',
  contentSampling: { pdfWords: 1000, imageSize: 512 },
  promptMode: 'standard',
  metadataFirst: false,
  maxTokensPerFile: 500
};
```

### Usage Example

```typescript
import { FileNamingSDK } from 'ai-file-naming';

// Initialize with API key and strategy
const sdk = new FileNamingSDK({
  apiKey: process.env.OPENAI_API_KEY,
  strategy: 'aggressive'
});

// Process files
const results = await sdk.nameBatch([
  'vacation/IMG_001.jpg',
  'vacation/IMG_002.jpg',
  'documents/report.pdf'
]);

// Results with token tracking
console.log(results);
// [
//   { file: 'IMG_001.jpg', name: 'beach_sunset_001', tokens: 50 },
//   { file: 'IMG_002.jpg', name: 'beach_sunset_002', tokens: 20 },
//   { file: 'report.pdf', name: 'q3_financial_report', tokens: 0 }
// ]

console.log(`Total tokens: ${results.reduce((sum, r) => sum + r.tokens, 0)}`);
// Total tokens: 70 (vs 2,400 traditional)
```

---

## Dependencies

### Production Dependencies
```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",      // PDF text extraction (no OS deps)
    "exifr": "^7.1.3",          // Image metadata extraction
    "openai": "^4.x"            // GPT-5 API client
  }
}
```

### Optional Dependencies
```json
{
  "optionalDependencies": {
    "sharp": "^0.33.0"          // Image thumbnails (has binaries)
  }
}
```

### Why These Libraries?
- **pdf-parse**: Pure JavaScript, works in Lambda/serverless
- **exifr**: Lightweight, fast EXIF reader
- **openai**: Official SDK with GPT-5 support
- **sharp** (optional): Fast image processing, but has native deps

---

## Testing Strategy

### Integration Tests Only
Focus on end-to-end functionality, not unit tests.

```typescript
describe('FileNamingSDK', () => {
  it('should name photos with 90% token reduction', async () => {
    const sdk = new FileNamingSDK({ strategy: 'aggressive' });
    const results = await sdk.nameBatch(photoFiles);

    expect(totalTokens(results)).toBeLessThan(originalTokens * 0.1);
    expect(accuracy(results)).toBeGreaterThan(0.85);
  });

  it('should use metadata for screenshots', async () => {
    const result = await sdk.nameFile('Screenshot_2024_01_15.png');
    expect(result.tokens).toBe(0);
    expect(result.name).toMatch(/screenshot_\d{4}_\d{2}_\d{2}/);
  });
});
```

### Test Data Sets
- 📸 50 vacation photos (similar content)
- 📄 20 business documents (varied)
- 🎬 10 video files (large files)
- 🖼️ 30 screenshots (metadata-rich)
- 📝 100 mixed files (stress test)

---

## Success Metrics

### Must Have (MVP)
- ✅ Process 50 files in <10 seconds
- ✅ 90%+ token reduction on photo batches
- ✅ 85%+ overall accuracy
- ✅ Work with PDF, images, videos
- ✅ <5 minute integration

### Nice to Have
- 🎯 95%+ token reduction on similar files
- 🎯 Support for 20+ file formats
- 🎯 Offline fallback mode
- 🎯 Custom naming patterns
- 🎯 Rename history/undo

### Out of Scope
- ❌ 100% accuracy (not realistic)
- ❌ Real-time processing
- ❌ GUI application
- ❌ Cloud deployment
- ❌ Multi-language support

---

## Cost Analysis

### Traditional Approach
```
Cost per file: $0.025-0.10
50 files: $1.25-5.00
1000 files/month: $25-100
```

### With Optimization
```
Cost per file: $0.001-0.005
50 files: $0.05-0.25
1000 files/month: $1-5
```

### ROI
- **Break-even**: After naming 100 files
- **Monthly savings**: $20-95 for regular users
- **Annual savings**: $240-1,140 for power users

---

## Quick Start Guide

### 1. Install
```bash
npm install ai-file-naming
```

### 2. Set API Key
```bash
export OPENAI_API_KEY=your-key-here
```

### 3. Run CLI
```bash
# Rename all images in a directory
ai-rename --dir ./photos --type image

# Aggressive optimization
ai-rename --dir ./documents --strategy aggressive

# Dry run (preview without renaming)
ai-rename --dir ./files --dry-run
```

### 4. Use in Code
```typescript
import { FileNamingSDK } from 'ai-file-naming';

const sdk = new FileNamingSDK({
  apiKey: process.env.OPENAI_API_KEY,
  strategy: 'balanced'
});

// Single file
const name = await sdk.nameFile('report.pdf');

// Batch with progress
const results = await sdk.nameBatch(files, {
  onProgress: (current, total) => {
    console.log(`Processing ${current}/${total}`);
  }
});
```

---

## Maintenance & Updates

### Version 1.0 (Current Plan)
- Core 5 components
- GPT-5 support
- 90% token reduction

### Version 1.1 (Future)
- Local model fallback (Ollama)
- Custom naming rules
- Undo/history

### Version 2.0 (Someday)
- GUI application
- Cloud sync
- Team collaboration

---

## Summary

This implementation plan delivers a **simple, effective SDK** that:
- **Saves 90%+ on API costs** through smart optimization
- **Processes files quickly** with minimal overhead
- **Integrates easily** into existing workflows
- **Avoids complexity** by focusing on what matters

**Total implementation time: 7 days**
**Total new code: ~600 lines**
**Dependencies: 3 packages**

Ready to build! 🚀