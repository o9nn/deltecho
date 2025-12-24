import { Sys6CycleEngine } from './src/engine/Sys6CycleEngine.js';
import { randn } from './src/tensors/types.js';
import { getLogger } from '@deltecho/shared';

const log = getLogger('sys6-triality/debug');

const engine = new Sys6CycleEngine({ dim: 32 });
const input = randn([1, 32]);

log.info('Input shape:', input.shape);
log.info('Engine dim:', engine.config.dim);

try {
  const result = engine.forward(input, 1);
  log.info('Success! Steps:', result.steps.length);
} catch (e: unknown) {
  const error = e as Error;
  log.error('Error:', error.message);
  log.debug('Stack:', error.stack?.split('\n').slice(0, 10).join('\n'));
}
