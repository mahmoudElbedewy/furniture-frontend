import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SITE_URL = "https://homestyle-store.vercel.app";
const API_BASE_URL = "https://mahmoudelbedewy-fureniture.hf.space";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchProducts() {
  const products = [];
  let nextUrl = `${API_BASE_URL}/api/catalog/products/`;

  while (nextUrl) {
    console.log(`Fetching products from ${nextUrl}...`);
    try {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Sometimes API returns list, sometimes paginated {results, next}
      if (Array.isArray(data)) {
        products.push(...data);
        nextUrl = null;
      } else if (data && data.results) {
        products.push(...data.results);
        nextUrl = data.next;
        // ensure nextUrl points to absolute HTTPS if it was returned as http or relative
        if (nextUrl && nextUrl.startsWith("http://")) {
            nextUrl = nextUrl.replace("http://", "https://");
        }
      } else {
        nextUrl = null;
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      break;
    }
  }
  
  return products;
}

async function fetchCategories() {
  console.log(`Fetching categories...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/catalog/categories/`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
  return [];
}

async function generateSitemap() {
  console.log("Starting sitemap generation...");
  
  const products = await fetchProducts();
  const categories = await fetchCategories();

  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core pages -->
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>
`;

  // Add category URLs if you want them mapped (e.g. /#catalog?category=slug)
  // Or just rely on the main page for categories.
  // Actually, wait, it looks like they don't have dedicated server routes for categories yet.
  // But we can add them with the hash or query string just in case they are indexable or handled.
  // For standard SEO, it's better to provide clean URLs. We will just provide products for now.

  console.log(`Adding ${products.length} products to sitemap...`);
  for (const product of products) {
    if (product.slug) {
      sitemapContent += `  <url>
    <loc>${SITE_URL}/products/${product.slug}</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>\n`;
    }
  }

  sitemapContent += `</urlset>`;

  const publicDir = path.join(__dirname, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  const sitemapPath = path.join(publicDir, "sitemap.xml");
  fs.writeFileSync(sitemapPath, sitemapContent);

  console.log(`✅ Done! Sitemap created successfully at ${sitemapPath}`);
}

generateSitemap().catch(console.error);