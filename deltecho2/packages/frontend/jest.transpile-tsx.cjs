/**
 * Transpile-only Jest transformer for source files whose emit collides with a
 * same-basename sibling (e.g. DeepTreeEchoBot.tsx next to DeepTreeEchoBot.ts).
 * The program-based ts-jest compiler cannot emit such files because both would
 * write the same output path, so this transformer compiles them in isolation.
 *
 * Note: unlike ts-jest, this transformer does not hoist jest.mock() calls, so
 * files compiled with it must register mocks before requiring mocked modules.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ts = require('typescript')

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2018,
  jsx: ts.JsxEmit.React,
  esModuleInterop: true,
  isolatedModules: true,
  inlineSourceMap: true,
}

module.exports = {
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      compilerOptions,
      fileName: sourcePath,
    })
    return { code: result.outputText }
  },
}
