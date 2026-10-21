import { createWorker } from 'tesseract.js';
import { ClothingCategory, ExtractedOCRItem, OCRResult } from '../types';

// Preprocess image on canvas to boost OCR accuracy on paper chits
export async function preprocessChitImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      // Constrain max dimension to 1600px for speed while maintaining sharpness
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw original
      ctx.drawImage(img, 0, 0, width, height);

      // Contrast enhancement and slight binarization
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Calculate average brightness
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += gray;
        }
        const avg = sum / (data.length / 4);
        const threshold = Math.max(100, Math.min(160, avg));

        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Increase contrast around threshold
          const contrast = 1.35;
          let factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
          let adjusted = factor * (gray - threshold) + threshold;
          adjusted = Math.max(0, Math.min(255, adjusted));

          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

// Category synonyms and fuzzy aliases common in Indian dhobi slips
const CATEGORY_ALIASES: Record<string, string[]> = {
  Kurta: ['kurta', 'kurti', 'kurtas', 'kameez'],
  Pajama: ['pajama', 'pyjama', 'paijama', 'payjama'],
  Shirt: ['shirt', 'shirts', 'shrt'],
  'T-Shirt': ['t-shirt', 'tshirt', 't shirt', 'tee', 't-shirts', 'tshirts'],
  Pant: ['pant', 'pants', 'trouser', 'trousers', 'jeans', 'jean'],
  Lower: ['lower', 'lowers', 'track pant', 'trackpant', 'track'],
  Shorts: ['shorts', 'short', 'half pant', 'boxers'],
  Bedsheet: ['bedsheet', 'bed sheet', 'sheet', 'chadar', 'bed cover'],
  'Pillow Cover': ['pillow cover', 'pillow', 'pilow', 'cover'],
  Towel: ['towel', 'towels', 'gamcha', 'bath towel'],
  Duppata: ['duppata', 'dupatta', 'chunni', 'scarf', 'shawl'],
  'Under Garments': ['under garment', 'underwear', 'undergarment', 'banyan', 'vest', 'brief', 'chaddi'],
  Socks: ['socks', 'sock', 'sox'],
  Hankey: ['hankey', 'hanky', 'handkerchief', 'rumal', 'hankeys'],
};

export async function recognizeChit(
  imageDataUrl: string,
  availableCategories: ClothingCategory[],
  onProgress?: (progress: number, status: string) => void
): Promise<OCRResult> {
  onProgress?.(10, 'Preparing image on device...');
  const processedUrl = await preprocessChitImage(imageDataUrl);

  onProgress?.(25, 'Initializing local OCR engine...');
  let worker;
  try {
    worker = await createWorker('eng');
    onProgress?.(45, 'Scanning slip text...');

    const ret = await worker.recognize(processedUrl);
    const rawText = ret.data.text || '';
    const ocrConfidence = ret.data.confidence || 0;

    onProgress?.(85, 'Parsing categories and quantities...');

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let slipNumber: string | undefined;
    let detectedDate: string | undefined;
    let totalItemsDetected: number | undefined;
    const detectedItems: ExtractedOCRItem[] = [];

    // Parse Slip number
    for (const line of lines) {
      // Look for "Slip", "No", "Chit", "#"
      const slipMatch = line.match(/(?:slip|no|chit|bill|token|#)[\s.:#-]*([a-zA-Z0-9-]{2,10})/i);
      if (slipMatch && !slipNumber) {
        slipNumber = slipMatch[1].trim();
      }

      // Look for Date (DD/MM/YYYY, DD-MM-YY, etc.)
      const dateMatch = line.match(/(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/);
      if (dateMatch && !detectedDate) {
        detectedDate = dateMatch[1];
      }

      // Look for Total count
      const totalMatch = line.match(/(?:total|tot|items|item count|qty|pcs)[\s.:=-]*(\d{1,3})/i);
      if (totalMatch && totalItemsDetected === undefined) {
        const val = parseInt(totalMatch[1], 10);
        if (val > 0 && val < 500) {
          totalItemsDetected = val;
        }
      }
    }

    // Fallback: search for stand-alone numbers at the top if no slip keyword
    if (!slipNumber && lines.length > 0) {
      const topLines = lines.slice(0, 3);
      for (const line of topLines) {
        const match = line.match(/^#?\s*([0-9]{3,7})$/);
        if (match) {
          slipNumber = match[1];
          break;
        }
      }
    }

    // Match categories & extract quantities
    // Build matcher map from available categories
    const categoryMap: { standardName: string; keywords: string[] }[] = [];
    availableCategories.forEach((cat) => {
      const aliases = CATEGORY_ALIASES[cat.name] || [cat.name.toLowerCase()];
      categoryMap.push({
        standardName: cat.name,
        keywords: [cat.name.toLowerCase(), ...aliases],
      });
    });

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check if line contains any category
      for (const entry of categoryMap) {
        const matchedKeyword = entry.keywords.find((kw) => {
          // Word boundary or containment
          const regex = new RegExp(`\\b${kw.replace('-', '[- ]?')}\\b`, 'i');
          return regex.test(lowerLine);
        });

        if (matchedKeyword) {
          // Look for number in this line
          // e.g. "Shirt: 3", "Shirt - 3", "3 Shirts", "Shirt 3", "Shirt   3"
          const numberMatches = line.match(/\b(\d{1,2})\b/g);
          let qty = 1; // default if mentioned

          if (numberMatches && numberMatches.length > 0) {
            // Find the number that isn't part of the category name
            const parsed = parseInt(numberMatches[numberMatches.length - 1], 10);
            if (!isNaN(parsed) && parsed > 0 && parsed <= 99) {
              qty = parsed;
            }
          }

          // Check if already detected
          const existing = detectedItems.find((i) => i.category === entry.standardName);
          if (existing) {
            existing.quantity = Math.max(existing.quantity, qty);
          } else {
            detectedItems.push({
              category: entry.standardName,
              quantity: qty,
              confidence: Math.round(ocrConfidence),
              rawText: line,
            });
          }
          break; // Stop after first category match in this line
        }
      }
    }

    await worker.terminate();
    onProgress?.(100, 'Scan complete');

    return {
      rawText,
      slipNumber,
      date: detectedDate,
      totalItemsDetected,
      detectedItems,
      confidence: Math.round(ocrConfidence),
    };
  } catch (error) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore
      }
    }
    // Return graceful partial result so user is NEVER blocked
    return {
      rawText: '',
      detectedItems: [],
      confidence: 0,
      notes: (error as Error).message || 'OCR processing fell back to manual entry',
    };
  }
}
