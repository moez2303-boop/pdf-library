export async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  outerSignal?: AbortSignal,
): Promise<Response> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const onOuterAbort = () => timeoutController.abort();
  outerSignal?.addEventListener("abort", onOuterAbort);

  try {
    return await fetch(url, { signal: timeoutController.signal });
  } catch (err) {
    if (timeoutController.signal.aborted && !outerSignal?.aborted) {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}
