import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

// The router keeps the window's scroll position between pages, so a page
// opened from low down (e.g. after submitting an order) would start at the bottom.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
