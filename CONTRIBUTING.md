# Contributing to Deltecho

Thank you for your interest in contributing to the Deltecho project! This document provides guidelines and instructions for contributing to this monorepo.

## Development Setup

### Prerequisites

- **Node.js**: Version 20 or higher
- **pnpm**: Version 9.6.0 or higher
- **Git**: Latest stable version

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/o9nn/deltecho.git
cd deltecho

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Project Structure

The Deltecho monorepo is organized into several key areas:

### Core Cognitive Packages

- **deep-tree-echo-core**: Runtime-agnostic cognitive modules (LLM, memory, personality)
- **dove9**: Triadic cognitive loop operating system
- **deep-tree-echo-orchestrator**: System daemon for coordination

### Unified Packages

Located in `packages/`:
- **@deltecho/cognitive**: Unified cognitive interface
- **@deltecho/reasoning**: AGI kernel with AtomSpace and PLN
- **@deltecho/shared**: Shared types and utilities
- **@deltecho/ui-components**: React UI components

### Desktop Applications

- **delta-echo-desk**: Delta Chat Desktop with AI Companion Hub
- **deltecho2**: Delta Chat Desktop with Inferno Kernel

## Development Workflow

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:core
pnpm build:orchestrator
pnpm build:dove9
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test:core
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format:fix

# Type checking
pnpm check
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode in tsconfig.json
- Provide proper type annotations
- Avoid using `any` type when possible

### Code Style

- Follow the Prettier configuration
- Use ESLint rules defined in .eslintrc.json
- Write descriptive variable and function names
- Add JSDoc comments for public APIs

### Commit Messages

Follow the Conventional Commits specification:

```
type(scope): subject

body

footer
```

Types:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

Example:
```
feat(core): add streaming LLM response support

Implement streaming API for LLM service to enable
real-time response generation.

Closes #123
```

## Pull Request Process

1. **Fork the repository** and create a new branch from `develop`
2. **Make your changes** following the coding standards
3. **Write or update tests** for your changes
4. **Ensure all tests pass**: `pnpm test`
5. **Lint and format**: `pnpm lint:fix && pnpm format:fix`
6. **Update documentation** if needed
7. **Submit a pull request** with a clear description

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with target branch

## Architecture Guidelines

### Runtime Agnostic Design

Core packages should be runtime-agnostic and use dependency injection for platform-specific functionality:

```typescript
interface MemoryStorage {
  load(key: string): Promise<string | undefined>;
  save(key: string, value: string): Promise<void>;
}

class MyService {
  constructor(private storage: MemoryStorage) {}
}
```

### Modular Organization

Keep modules focused and single-purpose. Use clear interfaces for communication between modules.

### Error Handling

- Use proper error types
- Provide meaningful error messages
- Handle errors at appropriate levels
- Log errors with context

## Testing Guidelines

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Aim for high coverage of critical paths
- Use descriptive test names

Example:
```typescript
describe('LLMService', () => {
  it('should process cognitive core requests correctly', async () => {
    // Arrange
    const service = new LLMService(mockConfig);
    
    // Act
    const result = await service.processCognitiveCore('test input');
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

- Test interactions between modules
- Use realistic test data
- Test error scenarios

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Include parameter descriptions and return types
- Provide usage examples for complex functions

### README Files

Each package should have a README.md with:
- Purpose and overview
- Installation instructions
- Usage examples
- API documentation

## Getting Help

- **Issues**: Open an issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check existing documentation first

## License

By contributing to Deltecho, you agree that your contributions will be licensed under the GPL-3.0-or-later license.
