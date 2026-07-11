import type { PortInfo, TransportKind } from './types';

function defaultPlatform(): string {
  return typeof process !== 'undefined' && process.platform ? process.platform : 'browser';
}

export function classifyPath(
  portPath: string,
  manufacturer: string | null = null,
  platform: string = defaultPlatform(),
): Pick<PortInfo, 'transport' | 'hint' | 'score' | 'ignore'> {
  const p = String(portPath || '').toLowerCase();
  const mfg = String(manufacturer || '').toLowerCase();
  const blob = `${p} ${mfg}`;

  if (
    p.includes('bluetooth-incoming') ||
    p.includes('debug-console') ||
    p.includes('bluetooth-modem') ||
    /^\/dev\/tty\./.test(p)
  ) {
    if (platform === 'darwin' && p.startsWith('/dev/tty.')) {
      return { transport: 'other', hint: 'Duplicate tty (use cu.*)', score: -100, ignore: true };
    }
    if (p.includes('bluetooth-incoming') || p.includes('debug-console')) {
      return { transport: 'other', hint: 'Not your OBD dongle', score: -50, ignore: true };
    }
  }

  if (
    /usb|usbserial|wch|ch340|ch341|ftdi|cp210|silabs|slab|prolific|pl2303|arduino/.test(blob) ||
    (platform === 'win32' && /usb/.test(blob))
  ) {
    return {
      transport: 'usb',
      hint: 'USB ELM327 / USB-serial',
      score: 100,
      ignore: false,
    };
  }

  if (/bluetooth|bt-|rfcomm|spp|obd|elm|chx|bafang/.test(blob)) {
    return {
      transport: 'bluetooth-classic',
      hint: 'Bluetooth Classic serial (SPP)',
      score: 80,
      ignore: false,
    };
  }

  if (platform === 'win32' && /^com\d+$/i.test(portPath)) {
    return {
      transport: 'serial',
      hint: 'Windows COM port (USB or paired BT)',
      score: 60,
      ignore: false,
    };
  }

  if (p.startsWith('/dev/cu.')) {
    return {
      transport: 'serial',
      hint: 'macOS serial — may be USB or paired BT',
      score: 40,
      ignore: false,
    };
  }

  return {
    transport: 'other' as TransportKind,
    hint: null,
    score: 10,
    ignore: false,
  };
}

export function classifyPort(
  p: {
    path: string;
    manufacturer?: string | null;
    vendorId?: string | null;
    productId?: string | null;
    serialNumber?: string | null;
  },
  platform: string = defaultPlatform(),
): PortInfo {
  const base = classifyPath(p.path, p.manufacturer ?? null, platform);
  return {
    path: p.path,
    manufacturer: p.manufacturer || null,
    serialNumber: p.serialNumber || null,
    vendorId: p.vendorId || null,
    productId: p.productId || null,
    ...base,
  };
}
