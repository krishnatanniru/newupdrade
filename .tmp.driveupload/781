import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export const useMobileOptimization = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouchDevice: false,
    screenWidth: 0,
    screenHeight: 0,
    devicePixelRatio: 1,
    orientation: 'portrait',
    safeArea: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const dpr = window.devicePixelRatio || 1;
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // Calculate safe area insets
      const safeArea = {
        top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')) || 0,
        bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0,
        left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-left')) || 0,
        right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-right')) || 0
      };

      setDeviceInfo({
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1024,
        isDesktop: width > 1024,
        isTouchDevice: isTouch,
        screenWidth: width,
        screenHeight: height,
        devicePixelRatio: dpr,
        orientation,
        safeArea
      });
    };

    // Initial detection
    updateDeviceInfo();

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    // Listen for device pixel ratio changes (for zoom)
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(resolution: 1dppx)');
      mediaQuery.addEventListener('change', updateDeviceInfo);
    }

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(resolution: 1dppx)');
        mediaQuery.removeEventListener('change', updateDeviceInfo);
      }
    };
  }, []);

  return deviceInfo;
};

// Hook for touch-specific optimizations
export const useTouchOptimization = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => setIsPressed(true);
  const handleTouchEnd = () => setIsPressed(false);
  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsPressed(false);
  };

  return {
    isHovering,
    isPressed,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
};

// Hook for performance optimization
export const usePerformanceOptimization = () => {
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  useEffect(() => {
    // Detect low-performance devices
    const isLowEndDevice = () => {
      // Check for mobile devices with limited resources
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasLowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 2;
      const hasSlowConnection = (navigator as any).connection && 
        ((navigator as any).connection.effectiveType === 'slow-2g' || 
         (navigator as any).connection.effectiveType === '2g');

      return isMobile && (hasLowMemory || hasSlowConnection);
    };

    setIsLowPerformance(isLowEndDevice());
  }, []);

  return {
    isLowPerformance,
    shouldReduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    shouldReduceData: window.matchMedia('(prefers-reduced-data: reduce)').matches
  };
};