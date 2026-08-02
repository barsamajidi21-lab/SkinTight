const loadedScripts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) {
    return Promise.resolve();
  }

  if (document.querySelector(`script[src="${src}"]`)) {
    loadedScripts.add(src);
    return Promise.resolve();
  }

  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      loadedScripts.add(src);
      loadingPromises.delete(src);
      resolve();
    };
    script.onerror = (err) => {
      loadingPromises.delete(src);
      reject(err);
    };
    document.head.appendChild(script);
  });

  loadingPromises.set(src, promise);
  return promise;
}

export function loadStyle(href: string): Promise<void> {
  if (document.querySelector(`link[href="${href}"]`)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = (err) => reject(err);
    document.head.appendChild(link);
  });
}

/**
 * Dynamically loads Leaflet CSS & JS on demand only when the map/clinic finder tab is opened
 */
export async function ensureLeafletLoaded(): Promise<any> {
  if ((window as any).L) {
    return (window as any).L;
  }
  await loadStyle('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js');
  return (window as any).L;
}

/**
 * Dynamically loads Chart.js on demand only when analytics/trend chart is mounted
 */
export async function ensureChartJsLoaded(): Promise<any> {
  if ((window as any).Chart) {
    return (window as any).Chart;
  }
  await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
  return (window as any).Chart;
}
