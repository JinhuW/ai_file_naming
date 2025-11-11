/**
 * Debug what content is being extracted and sent to AI
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
// import pdfParse from 'pdf-parse';
import exifr from 'exifr';

dotenv.config();

async function main() {
  console.log('🔍 Debugging Content Extraction\n');
  console.log('═'.repeat(70));

  // Test 1: Excel file
  console.log('\n📊 EXCEL FILE: Tungsung 25.9.22.xlsx');
  console.log('─'.repeat(70));

  const excelPath = '/Users/jinhu/Desktop/Tungsung 25.9.22.xlsx';

  try {
    const stats = await fs.stat(excelPath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Modified: ${stats.mtime.toISOString()}`);
    console.log(`Type: Excel spreadsheet (.xlsx)`);

    // Check if we can extract any metadata
    const exifData = await exifr.parse(excelPath).catch(() => null);
    console.log(`EXIF data: ${exifData ? 'Available' : 'None'}`);

    // Try to read as binary
    const buffer = await fs.readFile(excelPath);
    console.log(`Binary size: ${buffer.length} bytes`);
    console.log(`First 100 bytes (hex): ${buffer.slice(0, 100).toString('hex').slice(0, 100)}...`);

    // Excel files are ZIP archives, try to identify
    const header = buffer.slice(0, 4).toString('hex');
    console.log(`File signature: ${header} (${header === '504b0304' ? 'ZIP/XLSX ✓' : 'Unknown'})`);

    console.log('\n⚠️  Issue: Excel files are binary (cannot extract text without library)');
    console.log('   Current SDK likely only uses: filename + metadata');
    console.log('   Suggested name based on: "Tungsung 25.9.22" + file metadata');

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  }

  // Test 2: Video file
  console.log('\n\n🎬 VIDEO FILE: test.mov');
  console.log('─'.repeat(70));

  const videoPath = '/Users/jinhu/Desktop/test.mov';

  try {
    const stats = await fs.stat(videoPath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Modified: ${stats.mtime.toISOString()}`);
    console.log(`Created: ${stats.birthtime.toISOString()}`);
    console.log(`Type: QuickTime movie (.mov)`);

    // Check if we can extract any metadata
    const exifData = await exifr.parse(videoPath).catch(() => null);
    if (exifData) {
      console.log(`\nEXIF/Metadata found:`);
      console.log(JSON.stringify(exifData, null, 2));
    } else {
      console.log(`EXIF data: None`);
    }

    // Try to read as binary
    const buffer = await fs.readFile(videoPath);
    console.log(`Binary size: ${buffer.length} bytes`);

    // MOV files have specific atoms/headers
    const header = buffer.slice(0, 20).toString('ascii', 4, 12);
    console.log(`File type atom: ${header}`);

    console.log('\n⚠️  Issue: Video files need frame extraction (requires ffmpeg)');
    console.log('   Current SDK likely only uses: filename + metadata');
    console.log('   Suggested name based on: "test" + creation date + file size');

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  }

  console.log('\n\n📝 RECOMMENDATIONS:');
  console.log('═'.repeat(70));
  console.log('1. Excel files: Need xlsx parsing library (e.g., exceljs, xlsx)');
  console.log('   - Extract sheet names, first row headers');
  console.log('   - Read cell values to understand content');
  console.log('   - Current: Only filename analysis');
  console.log();
  console.log('2. Video files: Need video analysis');
  console.log('   - Extract metadata (title, description, tags)');
  console.log('   - Use creation date from file system');
  console.log('   - Optionally: Frame extraction with ffmpeg');
  console.log('   - Current: Only filename + basic metadata');
  console.log();
  console.log('3. Improve prompts to focus on available metadata');
  console.log('   - Use creation/modification dates');
  console.log('   - Use filename patterns as hints');
  console.log('   - Request more descriptive analysis from AI');
  console.log('═'.repeat(70));
}

main().catch(console.error);
