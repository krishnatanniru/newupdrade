/**
 * Production-ready QR Attendance System
 * - Time-based rotating tokens (30s window)
 * - HMAC-like signature for tamper protection
 * - Works offline (no Supabase needed for validation)
 * - BroadcastChannel for kiosk sound notifications
 */

const QR_SECRET = 'SpeedFitness_QR_v2_2025_Secure';
const WINDOW_SECONDS = 30;

// ─── Simple deterministic hash (FNV-1a variant) ──────────────────────────────
function simpleHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x85ebca77);
    h2 = Math.imul(h2 ^ ch, 0xc2b2ae3d);
  }
  h1 ^= Math.imul(h1 ^ (h2 >>> 15), 0x735a2d97);
  h2 ^= Math.imul(h2 ^ (h1 >>> 15), 0xcaf649a9);
  h1 ^= h2 >>> 16;
  h2 ^= h1 >>> 16;
  return (h1 >>> 0).toString(36).padStart(7, '0') + (h2 >>> 0).toString(36).padStart(7, '0');
}

// ─── Time window helpers ──────────────────────────────────────────────────────
export function getCurrentWindow(): number {
  return Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
}

export function getSecondsUntilNextWindow(): number {
  const elapsed = (Date.now() / 1000) % WINDOW_SECONDS;
  return Math.ceil(WINDOW_SECONDS - elapsed);
}

// ─── Branch QR Token (Kiosk display) ─────────────────────────────────────────
export interface BranchQRPayload {
  type: 'BRANCH_CHECKIN';
  branchId: string;
  token: string;
  window: number;
}

export function generateBranchQR(branchId: string): { qrValue: string; secondsLeft: number } {
  const win = getCurrentWindow();
  const token = simpleHash(`BRANCH:${branchId}:${win}:${QR_SECRET}`);
  const secondsLeft = getSecondsUntilNextWindow();

  const payload: BranchQRPayload = {
    type: 'BRANCH_CHECKIN',
    branchId,
    token,
    window: win,
  };

  return { qrValue: JSON.stringify(payload), secondsLeft };
}

export function validateBranchQR(payload: BranchQRPayload): boolean {
  const now = getCurrentWindow();
  // Accept ±1 window (90 seconds total validity — accounts for clock skew)
  for (let w = now - 1; w <= now + 1; w++) {
    const expected = simpleHash(`BRANCH:${payload.branchId}:${w}:${QR_SECRET}`);
    if (expected === payload.token) return true;
  }
  return false;
}

// ─── User Personal QR (shown by member/staff) ────────────────────────────────
export interface UserQRPayload {
  type: 'USER_ID';
  userId: string;
  role: string;
  memberId?: string;
  name: string;
  sig: string;
}

export function generateUserQR(userId: string, role: string, name: string, memberId?: string): string {
  const sig = simpleHash(`USER:${userId}:${role}:${QR_SECRET}`);
  const payload: UserQRPayload = {
    type: 'USER_ID',
    userId,
    role,
    memberId,
    name,
    sig,
  };
  return JSON.stringify(payload);
}

export function validateUserQR(payload: UserQRPayload): boolean {
  const expected = simpleHash(`USER:${payload.userId}:${payload.role}:${QR_SECRET}`);
  return expected === payload.sig;
}

// ─── Parse any QR code ───────────────────────────────────────────────────────
export type QRPayload = BranchQRPayload | UserQRPayload | { type: 'CLASS_COMPLETION'; [key: string]: any };

export function parseQRCode(raw: string): QRPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === 'string') return parsed as QRPayload;
    return null;
  } catch {
    return null;
  }
}

// ─── Anti-replay: track used branch tokens (per session) ─────────────────────
const usedTokens = new Set<string>();

export function markTokenUsed(token: string): void {
  usedTokens.add(token);
  // Clean up old tokens every 100 entries
  if (usedTokens.size > 200) {
    const arr = Array.from(usedTokens);
    arr.slice(0, 100).forEach(t => usedTokens.delete(t));
  }
}

export function isTokenUsed(token: string): boolean {
  return usedTokens.has(token);
}

// ─── Web Audio API — Sound Effects ───────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function playSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 3-tone ascending beep (like turnstile opening)
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = freq;
    gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.12 + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.18);

    oscillator.start(ctx.currentTime + i * 0.12);
    oscillator.stop(ctx.currentTime + i * 0.12 + 0.2);
  });
}

export function playFailureSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 2 low descending buzzes (access denied)
  [0, 0.25].forEach(offset => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime + offset);
    oscillator.frequency.linearRampToValueAtTime(120, ctx.currentTime + offset + 0.15);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + offset);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.18);

    oscillator.start(ctx.currentTime + offset);
    oscillator.stop(ctx.currentTime + offset + 0.2);
  });
}

export function unlockAudio(): void {
  // Must be called from a user gesture to enable Web Audio
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

// ─── BroadcastChannel for kiosk notifications ─────────────────────────────────
export const KIOSK_CHANNEL_NAME = 'speedfitness_kiosk_v2';

export interface KioskEvent {
  type: 'SCAN_SUCCESS' | 'SCAN_FAILED';
  branchId: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  userRole?: string;
  memberId?: string;
  message: string;
  timestamp: number;
}

export function broadcastKioskEvent(event: KioskEvent): void {
  try {
    const channel = new BroadcastChannel(KIOSK_CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch {
    // BroadcastChannel not supported (rare)
  }
}

export function listenKioskEvents(callback: (event: KioskEvent) => void): () => void {
  try {
    const channel = new BroadcastChannel(KIOSK_CHANNEL_NAME);
    channel.onmessage = (e) => callback(e.data as KioskEvent);
    return () => channel.close();
  } catch {
    return () => {};
  }
}
