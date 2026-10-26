export type PreloadQueueOptions = {
  concurrency?: number;
  shouldContinue?: () => boolean;
};

export const runPreloadQueue = async <T>(
  items: readonly T[],
  worker: (item: T) => Promise<unknown>,
  options: PreloadQueueOptions = {}
) => {
  const concurrency = Math.max(
    1,
    Math.min(Math.floor(options.concurrency ?? 1), items.length || 1)
  );
  const shouldContinue = options.shouldContinue ?? (() => true);
  let nextIndex = 0;

  const runWorker = async () => {
    while (shouldContinue()) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      try {
        await worker(items[index]);
      } catch {
        // Speculative work must never block later entries or primary UI work.
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, runWorker));
};
