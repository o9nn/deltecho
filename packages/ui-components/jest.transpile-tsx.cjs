/**
 * Transpile-only Jest transformer for source files whose emit collides with a
 * same-basename sibling (e.g. DeepTreeEchoBot.tsx next to DeepTreeEchoBot.ts).
 * The program-based ts-jest compiler cannot emit such files because both would
 * write the same output path, so this transformer compiles them in isolation.
 */
const ts = require('typescript');

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  isolatedModules: true,
  inlineSourceMap: true,
};

module.exports = {
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      compilerOptions,
      fileName: sourcePath,
    });
    return { code: result.outputText };
  },
};
