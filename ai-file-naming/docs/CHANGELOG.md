# Changelog

All notable changes to the AI File Naming SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-09

### Added

#### Core Features
- Initial SDK implementation with TypeScript
- Main `FileNamingSDK` class for file naming operations
- Configuration management system with Zod validation
- Event emitter system with 20+ event types
- Caching system with TTL support
- Comprehensive logging system

#### AI Providers
- OpenAI provider with GPT-4o and GPT-4o-mini support
- Anthropic provider with Claude 3 models (Opus, Sonnet, Haiku)
- Google Gemini provider (Pro, Pro Vision)
- Ollama provider for local AI models (llava, llama2, llama3, mistral, etc.)
- Provider registry for easy provider management
- Provider metrics and status tracking

#### File Processing
- Automatic file type detection (images, videos, documents, audio, code, archives)
- Image preparation and optimization with Sharp
- Video frame extraction with ffmpeg support
- File metadata extraction
- File validation and sanitization
- Hash generation for caching

#### Naming Features
- Single file naming with AI analysis
- Batch processing with configurable concurrency
- Multiple case formats (snake_case, kebab-case, camelCase, PascalCase, preserve)
- Custom prompt support per file or globally
- Filename sanitization and validation
- Unique filename generation

#### Developer Experience
- Full TypeScript type definitions
- Comprehensive JSDoc comments
- 4 usage examples
- Multiple test scripts
- ESLint and Prettier configuration
- Jest testing framework

#### Documentation
- Complete README with quickstart guide
- Feature comparison with reference project
- API documentation in code
- Project status and roadmap
- Changelog (this file)

### Dependencies
- Core: zod, p-queue, dotenv
- Image: sharp, file-type, exifr, mime-types
- PDF: pdf-parse
- Peer: openai, @anthropic-ai/sdk, @google/generative-ai, ollama

### Development
- TypeScript 5.3.3
- Node.js >= 18.0.0
- ESLint + Prettier
- Jest for testing

## [Unreleased]

### Planned for 0.2.0
- CLI tool wrapper
- OCR support for document analysis
- Semantic batch grouping
- More file analyzers
- Configuration GUI

### Planned for 0.3.0
- Desktop application (Electron)
- Folder restructuring AI
- Advanced conflict resolution
- Undo/redo functionality

### Planned for 0.4.0
- Cloud storage integration (S3, Google Drive, Dropbox)
- Multi-language support
- Content-based search
- Duplicate detection

### Planned for 1.0.0
- Stable API
- Complete test coverage (>90%)
- Performance optimizations
- Production-grade error handling
- Comprehensive documentation

## Notes

### Breaking Changes
None yet - this is the initial release.

### Deprecated
None yet.

### Security
- API keys are not logged
- File paths are sanitized
- Input validation with Zod
- Size limits for file uploads

### Known Issues
- OpenAI vision may require specific API key permissions
- Video processing requires ffmpeg system installation
- Some providers need manual SDK installation (peer dependencies)

## Contributing

See individual provider implementations for examples of how to extend the SDK.

## License

MIT - See LICENSE file for details.