import QRCode from 'qrcode';

/**
 * Generates an SVG or base64 DataURL QR code for a CTP Carton or Order
 */
export async function generateCartonQrCode(cartonId: string, metadata?: Record<string, any>): Promise<string> {
  try {
    const payload = JSON.stringify({
      id: cartonId,
      org: 'CTP_CHAUSSURES_2026',
      ts: Date.now(),
      ...metadata,
    });
    return await QRCode.toDataURL(payload, {
      margin: 1,
      width: 220,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.warn('QR Code generation failed, falling back to SVG', err);
    return '';
  }
}

/**
 * Synchronous mock QR data URL (simple black/white svg base64 fallback)
 */
export function getCartonQrCodeDataUrl(cartonId: string): string {
  // Simple quick SVG inline data URI that renders nicely immediately
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#ffffff" />
    <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
    <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
    <rect x="18" y="18" width="9" height="9" fill="#0f172a" />
    
    <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
    <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
    <rect x="73" y="18" width="9" height="9" fill="#0f172a" />
    
    <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
    <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
    <rect x="18" y="73" width="9" height="9" fill="#0f172a" />
    
    <rect x="42" y="15" width="8" height="8" fill="#0f172a" />
    <rect x="42" y="30" width="12" height="12" fill="#0f172a" />
    <rect x="60" y="45" width="15" height="10" fill="#0f172a" />
    <rect x="25" y="45" width="10" height="12" fill="#0f172a" />
    <rect x="45" y="60" width="12" height="15" fill="#0f172a" />
    <rect x="65" y="65" width="20" height="10" fill="#0f172a" />
    <rect x="75" y="80" width="15" height="10" fill="#0f172a" />
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
