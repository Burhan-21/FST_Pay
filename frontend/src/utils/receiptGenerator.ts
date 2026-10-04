export interface ReceiptData {
  transactionId: string;
  amount: number;
  recipientName: string;
  recipientDetail?: string;
  paymentMethod?: string;
  note?: string;
  date?: string | Date;
  status?: string;
  senderName?: string;
}

export function generateReceiptCanvas(data: ReceiptData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 1050;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(1, '#edf2f7');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer card container
  const cardMargin = 40;
  const cardX = cardMargin;
  const cardY = cardMargin;
  const cardW = width - cardMargin * 2;
  const cardH = height - cardMargin * 2;
  const radius = 32;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.restore();

  // Top header banner
  const bannerH = 160;
  const bannerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + bannerH);
  bannerGrad.addColorStop(0, '#2563eb');
  bannerGrad.addColorStop(0.5, '#4f46e5');
  bannerGrad.addColorStop(1, '#7c3aed');

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, bannerH, [radius, radius, 0, 0]);
  ctx.fillStyle = bannerGrad;
  ctx.fill();
  ctx.restore();

  // Brand text on banner
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FST PAY', cardX + 36, cardY + 68);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '500 14px sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('PREPAID SMART WALLET • OFFICIAL RECEIPT', cardX + 36, cardY + 98);

  // Status Badge
  const badgeX = cardX + cardW - 170;
  const badgeY = cardY + 52;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, 134, 38, 19);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓ SUCCESSFUL', badgeX + 67, badgeY + 24);
  ctx.restore();

  // Success icon circle
  const iconY = cardY + bannerH + 45;
  ctx.save();
  ctx.fillStyle = '#dcfce7';
  ctx.beginPath();
  ctx.arc(width / 2, iconY, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 14, iconY);
  ctx.lineTo(width / 2 - 4, iconY + 11);
  ctx.lineTo(width / 2 + 15, iconY - 10);
  ctx.stroke();
  ctx.restore();

  // Amount
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  const amountStr = `₹${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  ctx.fillText(amountStr, width / 2, iconY + 70);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 15px sans-serif';
  ctx.fillText(`Payment to ${data.recipientName}`, width / 2, iconY + 98);

  // Horizontal divider
  const lineY = iconY + 130;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, lineY);
  ctx.lineTo(cardX + cardW - 36, lineY);
  ctx.stroke();

  // Details Table
  const rows = [
    { label: 'Recipient Name', value: data.recipientName },
    ...(data.recipientDetail ? [{ label: 'Transfer Destination', value: data.recipientDetail }] : []),
    { label: 'Payment Method', value: data.paymentMethod || 'FST Pay Instant Transfer' },
    { label: 'Transaction ID', value: data.transactionId },
    { label: 'Date & Time', value: data.date ? new Date(data.date).toLocaleString('en-IN') : new Date().toLocaleString('en-IN') },
    ...(data.note ? [{ label: 'Payment Note', value: data.note }] : []),
    ...(data.senderName ? [{ label: 'Paid By', value: data.senderName }] : []),
    { label: 'Transaction Status', value: data.status || 'COMPLETED' },
  ];

  let currentY = lineY + 45;
  ctx.font = '14px sans-serif';

  rows.forEach((row) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText(row.label, cardX + 40, currentY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 14px sans-serif';
    ctx.fillText(row.value, cardX + cardW - 40, currentY);

    currentY += 40;
    ctx.font = '14px sans-serif';
  });

  // Bottom Security Lock & Watermark
  const footerY = cardY + cardH - 55;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12px sans-serif';
  ctx.fillText('🔒 256-Bit Encrypted • Verified by FST Pay Banking Node', width / 2, footerY);

  return canvas;
}

export async function shareOrDownloadReceiptJpg(data: ReceiptData): Promise<{ shared: boolean; downloaded: boolean }> {
  const canvas = generateReceiptCanvas(data);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve({ shared: false, downloaded: false });
        return;
      }

      const fileName = `FSTPay_Receipt_${data.transactionId.slice(-8)}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Check if native sharing supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'FST Pay Receipt',
            text: `Payment receipt for ₹${data.amount} to ${data.recipientName}`,
            files: [file],
          });
          resolve({ shared: true, downloaded: false });
          return;
        } catch {
          // User cancelled share dialog or fallback
        }
      }

      // Fallback: direct download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve({ shared: false, downloaded: true });
    }, 'image/jpeg', 0.95);
  });
}

export function downloadReceiptJpg(data: ReceiptData): void {
  const canvas = generateReceiptCanvas(data);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const fileName = `FSTPay_Receipt_${data.transactionId.slice(-8)}.jpg`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95);
}