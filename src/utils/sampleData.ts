import { ClothingCategory, LaundryItem, LaundryRecord } from '../types';

// Generate a realistic paper laundry chit canvas image
export function generateSampleChitImage(
  slipNumber: string,
  dateStr: string,
  items: { name: string; qty: number }[],
  dhobiName: string
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 950;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background: Warm off-white paper texture
  ctx.fillStyle = '#FAF7F0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper grain/lines
  ctx.strokeStyle = 'rgba(210, 205, 190, 0.45)';
  ctx.lineWidth = 1;
  for (let y = 160; y < 860; y += 42) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(660, y);
    ctx.stroke();
  }

  // Red left margin line typical of Indian laundry receipt books
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, 140);
  ctx.lineTo(150, 860);
  ctx.stroke();

  // Shop header (Printed style)
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(dhobiName.toUpperCase(), 350, 60);

  ctx.fillStyle = '#475569';
  ctx.font = '14px sans-serif';
  ctx.fillText('STEAM LAUNDRY & DRY CLEANING SERVICE', 350, 88);

  // Slip # and Date (Handwritten ink style - dark blue fountain pen)
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 110, 620, 40);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Slip No: ', 55, 136);

  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillText(slipNumber, 130, 136);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Date: ', 440, 136);

  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillText(dateStr, 495, 136);

  // Table Column Headers
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Items', 60, 185);
  ctx.fillText('Qty', 550, 185);

  // Table Content
  let currentY = 230;
  let totalCount = 0;

  items.forEach((item) => {
    // Category Name (Handwritten ink look)
    ctx.fillStyle = '#1E3A8A';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.name, 170, currentY);

    // Quantity (Handwritten digit)
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(item.qty.toString(), 565, currentY);

    totalCount += item.qty;
    currentY += 42;
  });

  // Total Line
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, currentY + 10);
  ctx.lineTo(660, currentY + 10);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Total Items:', 320, currentY + 45);

  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(totalCount.toString(), 565, currentY + 45);

  // Dhobi initial signature stamp
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(560, currentY + 120, 60, 35, Math.PI / 12, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('RAMESH', 560, currentY + 115);
  ctx.fillText('RECEIVED', 560, currentY + 132);

  // Footer note
  ctx.fillStyle = '#64748B';
  ctx.font = 'italic 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bring this original slip while collecting laundry.', 350, 910);

  return canvas.toDataURL('image/jpeg', 0.88);
}

export function createSampleLaundryRecords(userId: string = 'guest'): {
  records: LaundryRecord[];
  items: LaundryItem[];
} {
  const today = new Date();
  const dateStr1 = today.toISOString().split('T')[0];

  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 3);
  const dateStr2 = pastDate.toISOString().split('T')[0];

  // Record 1: Current Pending bag with attached realistic chit
  const sampleChit = generateSampleChitImage(
    '1042',
    dateStr1,
    [
      { name: 'Kurta', qty: 2 },
      { name: 'Shirt', qty: 3 },
      { name: 'Pant', qty: 2 },
      { name: 'Towel', qty: 1 },
    ],
    'Ramesh Dhobi & Drycleaners'
  );

  const rec1: LaundryRecord = {
    id: `DT-0001`,
    userId,
    slipNumber: '1042',
    dateGiven: dateStr1,
    dhobiName: 'Ramesh Dhobi',
    totalItems: 8,
    amount: 240,
    expectedReturnDate: new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0],
    notes: 'Starch kurta, light iron on shirts',
    status: 'pending',
    chitImageData: sampleChit,
    hasChitImage: true,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  };

  const items1: LaundryItem[] = [
    { id: `item_${userId}_1_1`, category: 'Kurta', quantityGiven: 2, quantityReturned: 0 },
    { id: `item_${userId}_1_2`, category: 'Shirt', quantityGiven: 3, quantityReturned: 0 },
    { id: `item_${userId}_1_3`, category: 'Pant', quantityGiven: 2, quantityReturned: 0 },
    { id: `item_${userId}_1_4`, category: 'Towel', quantityGiven: 1, quantityReturned: 0 },
  ];

  // Record 2: Partially returned bag
  const rec2: LaundryRecord = {
    id: `DT-0002`,
    userId,
    slipNumber: '0981',
    dateGiven: dateStr2,
    dhobiName: 'City Laundry Works',
    totalItems: 5,
    amount: 150,
    status: 'partially_returned',
    hasChitImage: false,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000,
  };

  const items2: LaundryItem[] = [
    { id: `item_${userId}_2_1`, category: 'Bedsheet', quantityGiven: 2, quantityReturned: 2 },
    { id: `item_${userId}_2_2`, category: 'Pillow Cover', quantityGiven: 2, quantityReturned: 2 },
    { id: `item_${userId}_2_3`, category: 'T-Shirt', quantityGiven: 1, quantityReturned: 0 }, // 1 outstanding
  ];

  return {
    records: [rec1, rec2],
    items: [...items1, ...items2],
  };
}
