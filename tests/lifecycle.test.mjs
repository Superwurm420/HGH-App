import { createLifecycleRegistry } from '../src/core/lifecycle.js';

const registry = createLifecycleRegistry();
let callCount = 0;
const id = registry.registerInterval(() => { callCount += 1; }, 10);
if (!id) throw new Error('registerInterval should return interval id');

await new Promise(resolve => setTimeout(resolve, 35));
if (callCount === 0) throw new Error('interval should trigger callback');

const target = new EventTarget();
let eventCount = 0;
registry.registerListener(target, 'ping', () => { eventCount += 1; });
target.dispatchEvent(new Event('ping'));
if (eventCount !== 1) throw new Error('listener should be called exactly once');

registry.disposeAll();
const afterDispose = callCount;
await new Promise(resolve => setTimeout(resolve, 30));
if (callCount !== afterDispose) throw new Error('interval should be disposed');

target.dispatchEvent(new Event('ping'));
if (eventCount !== 1) throw new Error('listener should have been removed');

console.log('lifecycle tests passed');
