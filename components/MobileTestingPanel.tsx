import React, { useState } from 'react';
import { useMobileOptimization, usePerformanceOptimization } from '../src/hooks/useMobileOptimization';

const MobileTestingPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const deviceInfo = useMobileOptimization();
  const performanceInfo = usePerformanceOptimization();

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <i className="fas fa-mobile-alt"></i>
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-2xl shadow-2xl p-6 w-80 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">📱 Device Info</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="space-y-4">
        {/* Device Type */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <h4 className="font-bold text-gray-700 mb-2">Device Type</h4>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              deviceInfo.isMobile ? 'bg-blue-100 text-blue-800' : 
              deviceInfo.isTablet ? 'bg-purple-100 text-purple-800' : 
              'bg-green-100 text-green-800'
            }`}>
              <i className={`fas ${deviceInfo.isMobile ? 'fa-mobile' : deviceInfo.isTablet ? 'fa-tablet' : 'fa-desktop'} mr-1`}></i>
              {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
            </span>
          </div>
        </div>

        {/* Screen Dimensions */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <h4 className="font-bold text-gray-700 mb-2">Screen</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Width:</span>
              <span className="font-mono ml-2">{deviceInfo.screenWidth}px</span>
            </div>
            <div>
              <span className="text-gray-500">Height:</span>
              <span className="font-mono ml-2">{deviceInfo.screenHeight}px</span>
            </div>
            <div>
              <span className="text-gray-500">DPR:</span>
              <span className="font-mono ml-2">{deviceInfo.devicePixelRatio}x</span>
            </div>
            <div>
              <span className="text-gray-500">Orientation:</span>
              <span className="font-mono ml-2 capitalize">{deviceInfo.orientation}</span>
            </div>
          </div>
        </div>

        {/* Device Features */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <h4 className="font-bold text-gray-700 mb-2">Features</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Touch Support:</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                deviceInfo.isTouchDevice ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {deviceInfo.isTouchDevice ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Performance:</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                performanceInfo.isLowPerformance ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {performanceInfo.isLowPerformance ? 'Low' : 'Normal'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Reduced Motion:</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                performanceInfo.shouldReduceMotion ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {performanceInfo.shouldReduceMotion ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Reduced Data:</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                performanceInfo.shouldReduceData ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {performanceInfo.shouldReduceData ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Safe Areas */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <h4 className="font-bold text-gray-700 mb-2">Safe Areas</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Top:</span>
              <span className="font-mono ml-2">{deviceInfo.safeArea.top}px</span>
            </div>
            <div>
              <span className="text-gray-500">Bottom:</span>
              <span className="font-mono ml-2">{deviceInfo.safeArea.bottom}px</span>
            </div>
            <div>
              <span className="text-gray-500">Left:</span>
              <span className="font-mono ml-2">{deviceInfo.safeArea.left}px</span>
            </div>
            <div>
              <span className="text-gray-500">Right:</span>
              <span className="font-mono ml-2">{deviceInfo.safeArea.right}px</span>
            </div>
          </div>
        </div>

        {/* Browser Info */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <h4 className="font-bold text-gray-700 mb-2">Browser</h4>
          <div className="text-sm">
            <div className="mb-1">
              <span className="text-gray-500">User Agent:</span>
              <span className="font-mono text-xs block mt-1 p-2 bg-white rounded border">
                {navigator.userAgent.substring(0, 50)}...
              </span>
            </div>
            <div>
              <span className="text-gray-500">Platform:</span>
              <span className="font-mono ml-2">{navigator.platform}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-bold text-gray-700 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Reload Page
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm font-bold"
            >
              Close Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTestingPanel;