import { useEffect } from "react";

type HeadOptions = {
  title: string;
  description?: string;
};

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Per-page equivalent of the old TanStack Start route `head()` config, now
// applied client-side since there is no SSR to inject <head> tags for us.
export function useDocumentHead({ title, description }: HeadOptions) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }
    setMeta("property", "og:title", title);
  }, [title, description]);
}
