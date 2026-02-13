#!/usr/bin/env node

/**
 * Post-build script to inject GTM into the exported HTML
 * This script runs after Expo export and modifies the generated index.html
 */

const fs = require('fs');
const path = require('path');

function injectGTM() {
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  
  // Check if file exists
  if (!fs.existsSync(indexPath)) {
    console.error('❌ dist/index.html not found. Run Expo export first.');
    process.exit(1);
  }
  
  // Read the HTML file
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // GTM scripts
  const gtmHead = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NGTVPGJH');</script>
<!-- End Google Tag Manager -->`;

  const gtmBody = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NGTVPGJH" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
  
  // Inject GTM in head
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${gtmHead}`);
  } else {
    console.error('❌ Could not find <head> tag in HTML');
    process.exit(1);
  }
  
  // Inject GTM noscript in body
  if (html.includes('<body>')) {
    html = html.replace('<body>', `<body>${gtmBody}`);
  } else {
    console.error('❌ Could not find <body> tag in HTML');
    process.exit(1);
  }
  
  // Write back the modified HTML
  fs.writeFileSync(indexPath, html);
  
  console.log('✅ GTM injected successfully into dist/index.html');
}

// Run the injection
injectGTM();
