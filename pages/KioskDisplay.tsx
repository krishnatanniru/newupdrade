import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../src/lib/supabase';

interface KioskDisplayProps {
  branchId?: string;
}

const KioskDisplay: React.FC<KioskDisplayProps> = ({ branchId: propBranchId }) => {
  const [branchId, setBranchId] = useState<string>(propBranchId || '');
  const [qrToken, setQrToken] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');

  useEffect(() => {
    // If branchId passed as prop, use it
    if (propBranchId) {
      setBranchId(propBranchId);
      setQrToken(propBranchId + '?' + Date.now());
      loadBranchName(propBranchId);
      return;
    }
    
    // Otherwise get from URL params
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const branchFromUrl = params.get('branch') || window.location.hash.split('/kiosk/')[1];
    
    if (branchFromUrl) {
      setBranchId(branchFromUrl);
      setQrToken(branchFromUrl + '?' + Date.now());
      loadBranchName(branchFromUrl);
    }
  }, [propBranchId]);

  const loadBranchName = async (id: string) => {
    const { data } = await supabase.from('branches').select('name').eq('id', id).single();
    if (data) setBranchName(data.name);
  };

  useEffect(() => {
    if (!branchId) return;
    
    const interval = setInterval(() => {
      setQrToken(branchId + '?' + Date.now());
    }, 15000);
    
    return () => clearInterval(interval);
  }, [branchId]);

  if (!branchId) return <div className="p-10 text-center">No branch specified</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-black text-white mb-2">{branchName || 'Gate Entry'}</h1>
      <p className="text-slate-400 mb-8">Scan to check in</p>
      
      <div className="bg-white p-8 rounded-3xl shadow-2xl">
        <QRCodeSVG value={qrToken || branchId} size={350} level="H" includeMargin={true} />
      </div>
      
      <div className="mt-8 flex items-center gap-2">
        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        <p className="text-slate-400">Auto-refreshes every 15 seconds</p>
      </div>
    </div>
  );
};

export default KioskDisplay;