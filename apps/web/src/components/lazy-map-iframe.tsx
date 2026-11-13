'use client';

import * as React from 'react';

/**
 * OpenStreetMap embed that is only inserted once its box is about to scroll
 * into view. Native `loading="lazy"` on iframes uses a very generous distance
 * threshold, so on phones the map (and its tile requests) still started
 * downloading during the initial page load, competing with the LCP text,
 * fonts and app JS. Until then the box keeps its size (no layout shift) and
 * shows the parent's placeholder background.
 */
export function LazyMapIframe({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {visible ? (
        <iframe
          title={title}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      ) : null}
    </div>
  );
}
