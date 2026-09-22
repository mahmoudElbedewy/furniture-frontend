const API_ORIGIN = "https://mahmoudelbedewy-fureniture.hf.space";
const SITE_ORIGIN = "https://myhomestyle.store";

const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const encodedPath = (segment) => encodeURIComponent(String(segment ?? ""));

async function fetchAll(path) {
  const items = [];
  let nextUrl = `${API_ORIGIN}${path}`;
  let pageCount = 0;

  while (nextUrl && pageCount < 20) {
    pageCount += 1;
    const response = await fetch(nextUrl);
    if (!response.ok) {
      throw new Error(`Catalog request failed: ${response.status}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
      items.push(...payload);
      break;
    }

    items.push(...(payload.results ?? []));
    nextUrl = payload.next ? new URL(payload.next, API_ORIGIN).toString() : null;
  }

  return items;
}

const urlEntry = (url, priority, changefreq) => `  <url>
    <loc>${xmlEscape(url)}</loc>
    <priority>${priority}</priority>
    <changefreq>${changefreq}</changefreq>
  </url>`;

export default async function handler(_req, res) {
  try {
    const [products, categories] = await Promise.all([
      fetchAll("/api/catalog/products/?page_size=100"),
      fetchAll("/api/catalog/categories/"),
    ]);

    const urls = [
      urlEntry(`${SITE_ORIGIN}/`, "1.0", "daily"),
      urlEntry(`${SITE_ORIGIN}/products`, "1.0", "daily"),
      urlEntry(`${SITE_ORIGIN}/about`, "0.4", "monthly"),
      ...categories
        .filter((category) => category?.slug)
        .map((category) =>
          urlEntry(
            `${SITE_ORIGIN}/category/${encodedPath(category.slug)}`,
            "0.7",
            "weekly",
          ),
        ),
      ...products
        .filter((product) => product?.slug)
        .map((product) =>
          urlEntry(
            `${SITE_ORIGIN}/product/${encodedPath(product.slug)}`,
            "0.8",
            "weekly",
          ),
        ),
    ];

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    );
    return res.status(200).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`,
    );
  } catch (error) {
    console.error("Unable to generate sitemap", error);
    return res.status(503).send("Sitemap is temporarily unavailable.");
  }
}
