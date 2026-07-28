export default async function handler(req, res) {
  const slug = req.query.slug;
  const userAgent = req.headers['user-agent'] || '';

  // Check if request is from a known bot (WhatsApp, Facebook, Twitter, etc.)
  const isBot = /bot|facebook|whatsapp|telegram|twitter|linkedin|pinterest|discord|slack/i.test(userAgent);

  if (!isBot) {
    // For normal users, serve the Vite SPA's index.html
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    try {
      // Fetching the root '/' will be caught by vercel.json rewrite and return the static index.html
      const response = await fetch(`${protocol}://${host}/`);
      const html = await response.text();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (e) {
      console.error(e);
      return res.status(500).send("Error loading SPA");
    }
  }

  // It's a bot, fetch product details to generate dynamic meta tags
  try {
    const productRes = await fetch(`https://mahmoudelbedewy-fureniture.hf.space/api/catalog/products/${slug}/`);
    
    if (!productRes.ok) {
      return res.status(404).send('Product not found');
    }
    
    const product = await productRes.json();
    const title = product.title || 'HomeStyle Product';
    const description = product.description || `اشتري ${title} من متجر هوم ستايل للأثاث.`;
    
    // Resolve image URL
    let imageUrl = 'https://homestyle-store.vercel.app/default-og.jpg'; // fallback
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (typeof firstImage === 'string') {
        imageUrl = firstImage;
      } else if (firstImage && typeof firstImage === 'object') {
        imageUrl = firstImage.image_url || firstImage.image || firstImage.url || imageUrl;
      }
    }
    
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https://mahmoudelbedewy-fureniture.hf.space${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    const hostUrl = req.headers['x-forwarded-host'] || req.headers.host || 'homestyle-store.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const url = `${protocol}://${hostUrl}/products/${slug}`;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:site_name" content="HomeStyle Store">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${url}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${imageUrl}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${title}">
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(html);

  } catch (err) {
    console.error(err);
    return res.status(500).send('Error generating OG tags');
  }
}
