import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type ScrollPosition = { left: number; max: number; thumbWidth: number };

export default function CategoryNavigation({ children, itemCount }: { children: ReactNode; itemCount: number }) {
  const navRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<ScrollPosition>({ left: 0, max: 0, thumbWidth: 28 });

  const measure = () => {
    const nav = navRef.current;
    if (!nav) return;
    const max = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const next = {
      left: Math.max(0, Math.min(max, nav.scrollLeft)),
      max,
      thumbWidth: Math.max(28, nav.clientWidth * nav.clientWidth / Math.max(1, nav.scrollWidth)),
    };
    setPosition((current) => current.left === next.left && current.max === next.max && current.thumbWidth === next.thumbWidth
      ? current : next);
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Watch both the viewport and category buttons, including categories loaded later.
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    for (const item of nav.children) observer.observe(item);
    return () => observer.disconnect();
  }, [itemCount]);

  return (
    <>
      <nav ref={navRef} className="category-nav" aria-label="商品分類" onScroll={measure}>
        {children}
      </nav>
      {position.max > 0 && (
        <input
          className="category-scrollbar"
          type="range"
          aria-label="左右捲動商品分類"
          aria-valuetext={`已捲動 ${Math.round(position.left / position.max * 100)}%`}
          min={0}
          max={position.max}
          step="any"
          value={position.left}
          style={{ '--category-scroll-thumb-width': `${position.thumbWidth}px` } as CSSProperties}
          onChange={(event) => {
            if (navRef.current) navRef.current.scrollLeft = Number(event.target.value);
            measure();
          }}
        />
      )}
    </>
  );
}
