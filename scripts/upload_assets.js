const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables dynamically from server/.env
const serverEnvPath = path.resolve(__dirname, '../server/.env');
let supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(serverEnvPath)) {
  const envContent = fs.readFileSync(serverEnvPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1].trim();
    } else if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceRoleKey = trimmed.split('=')[1].trim();
    }
  }
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env or process.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const BUCKET = 'app-assets';

async function uploadFile(localPath, remotePath) {
  const fileBuffer = fs.readFileSync(localPath);
  const mimeType = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const { data, error } = await supabase.storage.from(BUCKET).upload(remotePath, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error(`Error uploading ${remotePath}:`, error.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(remotePath);
  console.log(`Uploaded ${remotePath} -> ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}

async function main() {
  const urlMap = {};

  // 1. Upload primaryGoals
  const primaryGoalsDir = path.resolve(__dirname, '../assets/primaryGoals');
  const primaryGoalFiles = fs.readdirSync(primaryGoalsDir);
  for (const file of primaryGoalFiles) {
    if (file.endsWith('.png') || file.endsWith('.jpg')) {
      const local = path.join(primaryGoalsDir, file);
      const slug = file.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
      const remoteSlug = `primary-goals/${slug}`;
      const url = await uploadFile(local, remoteSlug);
      urlMap[file] = url;
    }
  }

  // 2. Upload foodScan
  const foodScanDir = path.resolve(__dirname, '../assets/foodScan');
  if (fs.existsSync(foodScanDir)) {
    const foodScanFiles = fs.readdirSync(foodScanDir);
    for (const file of foodScanFiles) {
      if (file.endsWith('.png') || file.endsWith('.jpg')) {
        const local = path.join(foodScanDir, file);
        const slug = file.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
        const remoteSlug = `food-scan/${slug}`;
        const url = await uploadFile(local, remoteSlug);
        urlMap[file] = url;
      }
    }
  }

  // 3. Upload loginUiImages
  const loginDir = path.resolve(__dirname, '../assets/loginUiImages');
  if (fs.existsSync(loginDir)) {
    const loginFiles = fs.readdirSync(loginDir);
    for (const file of loginFiles) {
      if (file.endsWith('.png') || file.endsWith('.jpg')) {
        const local = path.join(loginDir, file);
        const slug = file.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
        const remoteSlug = `login-ui/${slug}`;
        const url = await uploadFile(local, remoteSlug);
        urlMap[file] = url;
      }
    }
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../src/constants/remoteAssets.json'),
    JSON.stringify(urlMap, null, 2)
  );
  console.log('Saved remoteAssets.json successfully!');
}

main().catch(console.error);
