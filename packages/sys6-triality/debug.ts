import { Sys6CycleEngine } from './src/engine/Sys6CycleEngine.js';
import { randn } from './src/tensors/types.js';

const engine = new Sys6CycleEngine({ dim: 32 });
const input = randn([1, 32]);

console.log('Input shape:', input.shape);
console.log('Engine dim:', engine.config.dim);

try {
  const result = engine.forward(input, 1);
  console.log('Success! Steps:', result.steps.length);
} catch (e: any) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack?.split('\n').slice(0, 10).join('\n'));
}
