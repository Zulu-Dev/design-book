"use client";

import { useEffect, useState } from "react";

export function useCatalogScrollProgress(total: number | null) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!total || total <= 0) {
      setPercent(0);
      return;
    }

    const count = total;

    function update() {
      const cards = document.querySelectorAll<HTMLElement>("[data-catalog-position]");
      if (cards.length === 0) {
        setPercent(0);
        return;
      }

      const marker = window.scrollY + window.innerHeight * 0.4;
      let maxPosition = 0;

      cards.forEach((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const bottom = top + el.offsetHeight;
        if (top <= marker) {
          const pos = Number(el.dataset.catalogPosition);
          if (!Number.isNaN(pos) && pos > maxPosition) maxPosition = pos;
        }
      });

      setPercent(Math.min(100, ((maxPosition + 1) / count) * 100));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [total]);

  return percent;
}
