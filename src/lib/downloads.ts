// Offline audiobook downloads stored in IndexedDB.
// Each record: { id (video id), quality, mime, size, blob, savedAt }.

const DB_NAME = "sn.downloads";
const STORE = "audio";
const VERSION = 1;

export type DownloadRecord = {
  id: string;
  quality: string;
  mime: string;
  size: number;
  savedAt: number;
  blob: Blob;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then((db) =>
    new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }),
  );
}

function bump() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sn:storage", { detail: { key: "downloads" } }));
  }
}

export async function getDownload(id: string): Promise<DownloadRecord | null> {
  try {
    const r = await tx<DownloadRecord | undefined>("readonly", (s) => s.get(id));
    return r ?? null;
  } catch { return null; }
}

export async function hasDownload(id: string): Promise<boolean> {
  const r = await getDownload(id);
  return !!r;
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  try {
    return (await tx<DownloadRecord[]>("readonly", (s) => s.getAll())) ?? [];
  } catch { return []; }
}

export async function saveDownload(rec: DownloadRecord): Promise<void> {
  await tx("readwrite", (s) => s.put(rec));
  bump();
}

export async function deleteDownload(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
  bump();
}

// Cache of blob URLs to avoid repeated createObjectURL calls.
const urlCache = new Map<string, string>();
export async function getDownloadURL(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  const r = await getDownload(id);
  if (!r) return null;
  const url = URL.createObjectURL(r.blob);
  urlCache.set(id, url);
  return url;
}

export async function downloadStream(
  id: string,
  url: string,
  meta: { quality: string; mime: string },
  onProgress?: (loaded: number, total: number) => void,
): Promise<DownloadRecord> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  const blob = new Blob(chunks as BlobPart[], { type: meta.mime });
  const rec: DownloadRecord = {
    id, quality: meta.quality, mime: meta.mime, size: blob.size,
    savedAt: Date.now(), blob,
  };
  await saveDownload(rec);
  return rec;
}