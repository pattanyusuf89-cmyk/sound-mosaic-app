import { useEffect, useState } from "react";

// Force re-render when localStorage-backed data changes.
export function useStorageSubscription(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const on = () => setV((x) => x + 1);
    window.addEventListener("sn:storage", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("sn:storage", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return v;
}