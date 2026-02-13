#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// GTM script to inject
const gtmScript = `
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NGTVPGJH');</script>
    <!-- End Google Tag Manager -->`;

const gtmNoscript = `
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NGTVPGJH" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->`;

async function buildWithGTM() {
  try {
    console.log('🏗️  Building with Expo...');
    
    // Run Expo export
    const { spawn } = require('child_process');
    await new Promise((resolve, reject) => {
      const expo = spawn('npx', ['expo', 'export', '--platform', 'web'], {
        stdio: 'inherit'
      });
      
      expo.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Expo build failed with code ${code}`));
        }
      });
    });
    
    console.log('✅ Expo build complete');
    
    // Read the generated HTML
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Inject GTM script in head
    const headMatch = html.match(/<head>/);
    if (headMatch) {
      html = html.replace(
        headMatch[0],
        headMatch[0] + gtmScript
      );
    }
    
    // Inject GTM noscript in body
    const bodyMatch = html.match(/<body>/);
    if (bodyMatch) {
      html = html.replace(
        bodyMatch[0],
        bodyMatch[0] + gtmNoscript
      );
    }
    
    // Write the modified HTML
    fs.writeFileSync(indexPath, html);
    
    console.log('🎯 GTM script injected successfully!');
    console.log('📁 dist/index.html updated with GTM tracking');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildWithGTM();
