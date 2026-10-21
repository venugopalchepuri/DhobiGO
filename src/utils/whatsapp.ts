import { LaundryItem, LaundryRecord } from '../types';

export function formatLaundryDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function generateWhatsAppMessage(
  record: LaundryRecord,
  items: LaundryItem[]
): string {
  const formattedDate = formatLaundryDate(record.dateGiven);
  const activeItems = items.filter((i) => i.quantityGiven > 0);

  const lines: string[] = [];
  lines.push(`🧺 *Dhobi Tracker — Laundry Bag*`);
  lines.push(`Bag ID: ${record.id}`);
  lines.push(`Date: ${formattedDate}`);
  if (record.slipNumber) {
    lines.push(`Slip No.: ${record.slipNumber}`);
  }
  if (record.dhobiName) {
    lines.push(`Dhobi: ${record.dhobiName}`);
  }
  if (record.expectedReturnDate) {
    lines.push(`Expected Return: ${formatLaundryDate(record.expectedReturnDate)}`);
  }

  lines.push('');
  lines.push(`*Clothing Items Handed Over:*`);
  activeItems.forEach((item) => {
    lines.push(`• ${item.category}: ${item.quantityGiven}`);
  });

  lines.push('');
  lines.push(`*Total: ${record.totalItems} items*`);

  if (record.amount && record.amount > 0) {
    lines.push(`Amount: ₹${record.amount}`);
  }

  if (record.notes) {
    lines.push(`Note: ${record.notes}`);
  }

  lines.push('');
  lines.push(`_Please confirm the item count upon receipt._`);

  return lines.join('\n');
}

// Convert data URL to File for native Android share sheet with image
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

export async function shareLaundryRecord(
  record: LaundryRecord,
  items: LaundryItem[]
): Promise<{ success: boolean; method: 'native_share' | 'whatsapp_link' | 'clipboard' }> {
  const messageText = generateWhatsAppMessage(record, items);

  // Try Android native share sheet first (can include image file!)
  if (navigator.share) {
    try {
      const shareData: ShareData = {
        title: `Dhobi Laundry Bag ${record.id}`,
        text: messageText,
      };

      if (record.chitImageData && navigator.canShare) {
        const file = await dataUrlToFile(record.chitImageData, `dhobi-chit-${record.id}.jpg`);
        if (file && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      }

      await navigator.share(shareData);
      return { success: true, method: 'native_share' };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return { success: false, method: 'native_share' };
      }
      // If native share fails, fallback below
    }
  }

  // Fallback to WhatsApp URL intent
  try {
    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.location.href = whatsappUrl;
    return { success: true, method: 'whatsapp_link' };
  } catch {
    // Ultimate fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(messageText);
      return { success: true, method: 'clipboard' };
    } catch {
      return { success: false, method: 'clipboard' };
    }
  }
}
