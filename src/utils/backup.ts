import JSZip from 'jszip';
import { localDB } from '../db/indexedDb';
import { AppSettings, ClothingCategory, IDProofCredential, LaundryItem, LaundryRecord } from '../types';

export interface BackupValidationResult {
  valid: boolean;
  recordCount: number;
  itemCount: number;
  imageCount: number;
  exportDate?: string;
  errorMessage?: string;
  data?: {
    records: LaundryRecord[];
    items: LaundryItem[];
    categories: ClothingCategory[];
    settings?: AppSettings;
    idProof?: IDProofCredential | null;
  };
}

// Create a complete offline ZIP backup with separated image files
export async function createZipBackup(userId: string = 'guest'): Promise<Blob> {
  const backupData = await localDB.exportFullBackup(userId);
  const zip = new JSZip();

  const imgFolder = zip.folder('chit_images');
  let imageCounter = 0;

  // Clone records and save images as distinct binary files in ZIP
  const strippedRecords: LaundryRecord[] = [];

  for (const record of backupData.records) {
    const copy = { ...record };
    if (record.chitImageData) {
      try {
        const matches = record.chitImageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const extension = matches[1].includes('png') ? 'png' : 'jpg';
          const filename = `${record.id}_slip.${extension}`;
          imgFolder?.file(filename, matches[2], { base64: true });
          imageCounter++;
        }
      } catch (e) {
        console.error('Failed to isolate image for zip:', e);
      }
    }
    // We retain the full record in records.json as well for total resiliency
    strippedRecords.push(copy);
  }

  // Add JSON manifests
  zip.file(
    'metadata.json',
    JSON.stringify(
      {
        appName: 'Dhobi Tracker',
        version: '1.0.0',
        exportDate: backupData.exportDate,
        recordCount: backupData.records.length,
        itemCount: backupData.items.length,
        imageCount: imageCounter,
      },
      null,
      2
    )
  );

  zip.file('records.json', JSON.stringify(backupData.records, null, 2));
  zip.file('items.json', JSON.stringify(backupData.items, null, 2));
  zip.file('categories.json', JSON.stringify(backupData.categories, null, 2));
  zip.file('settings.json', JSON.stringify(backupData.settings, null, 2));
  if (backupData.idProof) {
    zip.file('id_proof.json', JSON.stringify(backupData.idProof, null, 2));
  }

  return await zip.generateAsync({ type: 'blob' });
}

// Download the ZIP backup file
export function triggerBackupDownload(zipBlob: Blob) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `dhobi-tracker-backup-${dateStr}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Validate a ZIP or JSON backup file before restoring
export async function validateBackupFile(file: File): Promise<BackupValidationResult> {
  try {
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);

      // Verify records.json
      const recordsFile = zip.file('records.json');
      if (!recordsFile) {
        return {
          valid: false,
          recordCount: 0,
          itemCount: 0,
          imageCount: 0,
          errorMessage: 'Missing records.json in the ZIP archive. Invalid Dhobi Tracker backup.',
        };
      }

      const recordsJson = await recordsFile.async('string');
      const records: LaundryRecord[] = JSON.parse(recordsJson);

      const itemsFile = zip.file('items.json');
      const items: LaundryItem[] = itemsFile ? JSON.parse(await itemsFile.async('string')) : [];

      const categoriesFile = zip.file('categories.json');
      const categories: ClothingCategory[] = categoriesFile
        ? JSON.parse(await categoriesFile.async('string'))
        : [];

      const settingsFile = zip.file('settings.json');
      const settings: AppSettings | undefined = settingsFile
        ? JSON.parse(await settingsFile.async('string'))
        : undefined;

      const metadataFile = zip.file('metadata.json');
      let exportDate = new Date().toLocaleDateString();
      if (metadataFile) {
        try {
          const meta = JSON.parse(await metadataFile.async('string'));
          if (meta.exportDate) exportDate = meta.exportDate;
        } catch {
          // ignore
        }
      }

      // Check if image files exist in chit_images folder and reconnect them if needed
      let imageCount = 0;
      for (const record of records) {
        if (record.chitImageData) {
          imageCount++;
        } else {
          // Check if stored in chit_images
          const jpgFile = zip.file(`chit_images/${record.id}_slip.jpg`);
          const pngFile = zip.file(`chit_images/${record.id}_slip.png`);
          const found = jpgFile || pngFile;
          if (found) {
            const b64 = await found.async('base64');
            const mime = found.name.endsWith('png') ? 'image/png' : 'image/jpeg';
            record.chitImageData = `data:${mime};base64,${b64}`;
            record.hasChitImage = true;
            imageCount++;
          }
        }
      }

      const idProofFile = zip.file('id_proof.json');
      const idProof: IDProofCredential | null = idProofFile
        ? JSON.parse(await idProofFile.async('string'))
        : null;

      return {
        valid: true,
        recordCount: records.length,
        itemCount: items.length,
        imageCount,
        exportDate,
        data: {
          records,
          items,
          categories,
          settings,
          idProof,
        },
      };
    } else if (file.name.endsWith('.json')) {
      // JSON backup support
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed.records)) {
        return {
          valid: false,
          recordCount: 0,
          itemCount: 0,
          imageCount: 0,
          errorMessage: 'Invalid JSON format: missing records array.',
        };
      }

      const records = parsed.records as LaundryRecord[];
      const items = (parsed.items as LaundryItem[]) || [];
      const categories = (parsed.categories as ClothingCategory[]) || [];
      const imageCount = records.filter((r) => !!r.chitImageData).length;

      return {
        valid: true,
        recordCount: records.length,
        itemCount: items.length,
        imageCount,
        exportDate: parsed.exportDate || new Date().toISOString(),
        data: {
          records,
          items,
          categories,
          settings: parsed.settings,
          idProof: parsed.idProof || null,
        },
      };
    } else {
      return {
        valid: false,
        recordCount: 0,
        itemCount: 0,
        imageCount: 0,
        errorMessage: 'Unsupported file type. Please select a .zip or .json backup file.',
      };
    }
  } catch (err) {
    return {
      valid: false,
      recordCount: 0,
      itemCount: 0,
      imageCount: 0,
      errorMessage: `Could not parse backup file: ${(err as Error).message}`,
    };
  }
}
