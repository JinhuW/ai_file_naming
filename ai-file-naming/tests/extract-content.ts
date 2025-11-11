/**
 * Extract actual content from Excel and Video files
 */

import * as fs from 'fs/promises';
import * as XLSX from 'xlsx';
import exifr from 'exifr';

async function main() {
  console.log('📊 Extracting Excel Content\n');
  console.log('═'.repeat(70));

  const excelPath = '/Users/jinhu/Desktop/Tungsung 25.9.22.xlsx';

  // Read Excel file
  const workbook = XLSX.readFile(excelPath);

  console.log(`Workbook info:`);
  console.log(`  Sheet count: ${workbook.SheetNames.length}`);
  console.log(`  Sheet names: ${workbook.SheetNames.join(', ')}`);
  console.log();

  // Get first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    console.log('No sheets found');
    return;
  }
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    console.log('Sheet not found');
    return;
  }

  // Convert to JSON to see data
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`First sheet: "${firstSheetName}"`);
  console.log(`Rows: ${jsonData.length}`);
  console.log();

  console.log('First 10 rows:');
  console.log('─'.repeat(70));
  jsonData.slice(0, 10).forEach((row: any, idx) => {
    if (Array.isArray(row) && row.length > 0) {
      console.log(`Row ${idx + 1}: ${row.slice(0, 5).join(' | ')}`);
    }
  });
  console.log('─'.repeat(70));

  // Extract key information for naming
  console.log('\n📝 Content Summary for AI:');
  const firstRow = jsonData[0] as any[];
  const secondRow = jsonData[1] as any[];

  console.log(`  Headers/First row: ${firstRow?.slice(0, 5).join(', ')}`);
  console.log(`  Second row: ${secondRow?.slice(0, 5).join(', ')}`);
  console.log(`  Sheet name: ${firstSheetName}`);
  console.log(`  Total rows: ${jsonData.length}`);

  // Create descriptive summary
  const summary = `Excel file with ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}. First sheet "${firstSheetName}" has ${jsonData.length} rows. Headers: ${firstRow?.slice(0, 5).join(', ')}`;
  console.log(`\n  Suggested AI prompt addition: "${summary}"`);

  console.log('\n\n🎬 Extracting Video Metadata\n');
  console.log('═'.repeat(70));

  const videoPath = '/Users/jinhu/Desktop/test.mov';

  const stats = await fs.stat(videoPath);

  console.log(`Video file info:`);
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Created: ${stats.birthtime.toISOString()}`);
  console.log(`  Modified: ${stats.mtime.toISOString()}`);

  // Try to extract metadata
  const metadata = await exifr.parse(videoPath).catch(() => null);

  if (metadata) {
    console.log(`\nVideo metadata found:`);
    Object.entries(metadata).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  } else {
    console.log(`\nNo EXIF metadata found`);
  }

  // Create descriptive summary for video
  const videoSummary = `Video file (QuickTime MOV), ${(stats.size / 1024 / 1024).toFixed(0)}MB, created ${stats.birthtime.toISOString().split('T')[0]}`;
  console.log(`\n  Suggested AI prompt addition: "${videoSummary}"`);

  console.log('\n\n✅ Content extraction complete!');
}

main().catch(console.error);
