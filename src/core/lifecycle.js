export function createLifecycleRegistry() {
  const disposers = new Set();

  return {
    registerDisposer(fn) {
      if (typeof fn !== 'function') return () => {};
      disposers.add(fn);
      return () => disposers.delete(fn);
    },
    registerInterval(callback, ms) {
      const id = setInterval(callback, ms);
      const dispose = () => clearInterval(id);
      disposers.add(dispose);
      return id;
    },
    registerListener(target, event, handler, options) {
      if (!target?.addEventListener) return () => {};
      target.addEventListener(event, handler, options);
      const dispose = () => target.removeEventListener(event, handler, options);
      disposers.add(dispose);
      return dispose;
    },
    disposeAll() {
      for (const dispose of [...disposers]) {
        try { dispose(); } catch {}
      }
      disposers.clear();
    }
  };
}
