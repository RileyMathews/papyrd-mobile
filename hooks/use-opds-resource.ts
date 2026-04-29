import { useEffect, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
};

export function useOpdsResource<T>(
  href: string,
  load: (href: string, signal?: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setState((current) => ({
      data: current.data,
      error: null,
      isLoading: true,
    }));

    load(href, controller.signal)
      .then((data) => {
        setState({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error : new Error("Failed to load resource."),
          isLoading: false,
        });
      });

    return () => controller.abort();
  }, [href, load, requestVersion]);

  return {
    ...state,
    refresh: () => setRequestVersion((version) => version + 1),
  };
}
