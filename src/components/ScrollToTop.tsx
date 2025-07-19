// src/components/ScrollToTop.tsx
import { useEffect, useLayoutEffect } from 'react';

interface ScrollToTopProps {
  children?: React.ReactNode;
  activeTab?: string;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ children, activeTab }) => {
  // Tab değiştiğinde scroll'u en üste al
  useLayoutEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };

    scrollToTop();
  }, [activeTab]);

  // Component mount olduğunda da scroll reset
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };

    resetScroll();
    
    // Async content için biraz gecikme ile tekrar
    const timeoutId = setTimeout(resetScroll, 50);

    return () => clearTimeout(timeoutId);
  }, [activeTab]);

  return <>{children}</>;
};

export default ScrollToTop;