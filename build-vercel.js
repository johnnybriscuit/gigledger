#!/usr/bin/env node

/**
 * Vercel-specific build script for GTM injection
 * Handles environment differences and timing issues
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`🏗️  Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Command completed successfully`);
        resolve();
      } else {
        console.error(`❌ Command failed with code ${code}`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ Command error: ${error.message}`);
      reject(error);
    });
  });
}

function waitForFile(filePath, maxWait = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkFile = () => {
      if (fs.existsSync(filePath)) {
        // Additional check: ensure file is not empty
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          console.log(`✅ File ready: ${filePath} (${stats.size} bytes)`);
          resolve();
        } else {
          console.log(`⏳ File exists but empty, waiting...`);
          setTimeout(checkFile, 500);
        }
      } else if (Date.now() - startTime > maxWait) {
        reject(new Error(`File not found after ${maxWait}ms: ${filePath}`));
      } else {
        setTimeout(checkFile, 500);
      }
    };
    
    checkFile();
  });
}

function injectGTM() {
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  
  console.log('🎯 Starting GTM injection...');
  
  // Wait for file to exist and be ready
  return waitForFile(indexPath, 15000)
    .then(() => {
      console.log('📖 Reading HTML file...');
      let html = fs.readFileSync(indexPath, 'utf8');
      
      // GTM scripts
      const gtmHead = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NGTVPGJH');</script>
<!-- End Google Tag Manager -->`;

      const gtmBody = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NGTVPGJH" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
      
      // Validate HTML structure
      if (!html.includes('<head>')) {
        throw new Error('Could not find <head> tag in HTML');
      }
      
      if (!html.includes('<body>')) {
        throw new Error('Could not find <body> tag in HTML');
      }
      
      // Inject GTM in head
      html = html.replace('<head>', `<head>${gtmHead}`);
      
      // Inject GTM noscript in body
      html = html.replace('<body>', `<body>${gtmBody}`);
      
      // Write back the modified HTML
      fs.writeFileSync(indexPath, html);
      
      console.log('✅ GTM injected successfully!');
      console.log(`📁 Modified: ${indexPath}`);
      
      // Verify injection
      const modifiedHtml = fs.readFileSync(indexPath, 'utf8');
      if (modifiedHtml.includes('GTM-NGTVPGJH')) {
        console.log('✅ GTM container verified in HTML');
      } else {
        throw new Error('GTM injection verification failed');
      }
    });
}

async function build() {
  try {
    console.log('🚀 Starting Vercel build process...');
    
    // Step 1: Run Expo export
    await runCommand('npx', ['expo', 'export', '--platform', 'web']);
    
    // Step 2: Inject GTM
    await injectGTM();
    
    console.log('🎉 Build completed successfully!');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
build();
