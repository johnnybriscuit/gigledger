const fs = require('fs');

const gtmScript = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NGTVPGJH');</script>
<!-- End Google Tag Manager -->`;

const gtmNoscript = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NGTVPGJH" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

try {
  let html = fs.readFileSync('dist/index.html', 'utf8');
  
  // Inject GTM script in head
  html = html.replace(/<head>/, '<head>' + gtmScript);
  
  // Inject GTM noscript in body
  html = html.replace(/<body>/, '<body>' + gtmNoscript);
  
  fs.writeFileSync('dist/index.html', html);
  console.log('GTM injected successfully!');
} catch (error) {
  console.error('Error injecting GTM:', error.message);
  process.exit(1);
}
