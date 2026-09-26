import * as dotenv from 'dotenv';
import path from 'path';

// Snapshot the environment before dotenv
const preDotenvKey = process.env.PRIVATE_KEY;
console.log('Before dotenv:');
console.log(`- Exists: ${!!preDotenvKey}`);

// Load dotenv
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const postDotenvKey = process.env.PRIVATE_KEY;

console.log('After dotenv:');
console.log(`- Exists: ${!!postDotenvKey}`);

if (postDotenvKey) {
  console.log(`- Length: ${postDotenvKey.length}`);
  console.log(`- Starts with 0x: ${postDotenvKey.startsWith('0x')}`);
  
  const withoutPrefix = postDotenvKey.startsWith('0x') ? postDotenvKey.slice(2) : postDotenvKey;
  const isHex = /^[0-9a-fA-F]+$/.test(withoutPrefix);
  console.log(`- Remaining characters are hex: ${isHex}`);
  console.log(`- Remaining length: ${withoutPrefix.length}`);
  
  const hasWhitespace = /\s/.test(postDotenvKey);
  const hasQuotes = postDotenvKey.startsWith('"') || postDotenvKey.endsWith('"') || postDotenvKey.startsWith("'") || postDotenvKey.endsWith("'");
  
  console.log(`- Contains whitespace: ${hasWhitespace}`);
  console.log(`- Wrapped in quotes: ${hasQuotes}`);
  
  // Check for common placeholders
  const isPlaceholder = postDotenvKey.includes('YOUR_') || postDotenvKey.toLowerCase().includes('private_key');
  console.log(`- Appears to be a placeholder: ${isPlaceholder}`);
}
