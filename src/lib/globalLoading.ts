const GLOBAL_LOADING_START = "global-loading:start";
const GLOBAL_LOADING_END = "global-loading:end";

export const globalLoadingEvents = {
  start: GLOBAL_LOADING_START,
  end: GLOBAL_LOADING_END,
};

export const startGlobalLoading = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GLOBAL_LOADING_START));
};

export const endGlobalLoading = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GLOBAL_LOADING_END));
};
