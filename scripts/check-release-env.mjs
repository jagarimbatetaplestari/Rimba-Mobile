const required = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'NEXT_PUBLIC_REVENUECAT_IOS_KEY', 'APPLE_CERTIFICATE_BASE64',
  'APPLE_CERTIFICATE_PASSWORD', 'APPLE_PROVISION_PROFILE_BASE64',
  'APPLE_WIDGET_PROVISION_PROFILE_BASE64',
  'APP_STORE_CONNECT_PRIVATE_KEY_BASE64',
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing release configuration: ${missing.join(', ')}`);
  process.exit(1);
}
const invalid = [];
for (const name of ['NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID']) {
  if (!/^\d+-[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(process.env[name])) {
    invalid.push(name);
  }
}
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://rkljugrrscmqopeuwtpd.supabase.co') {
  invalid.push('NEXT_PUBLIC_SUPABASE_URL');
}
if (!/^appl_\S+$/.test(process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY)) {
  invalid.push('NEXT_PUBLIC_REVENUECAT_IOS_KEY');
}
if (invalid.length) {
  console.error(`Invalid release configuration: ${invalid.join(', ')}`);
  process.exit(1);
}
console.log('Release configuration present; signing and live StoreKit acceptance still required.');
