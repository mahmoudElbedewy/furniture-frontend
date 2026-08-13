const API_ORIGIN = "https://mahmoudelbedewy-fureniture.hf.space";
const SITE_ORIGIN = "https://homestyle-store.vercel.app";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85";
const BOT_PATTERN =
  /bot|facebook|whatsapp|telegram|twitter|linkedin|pinterest|discord|slack/i;

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const truncate = (value, length = 160) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= length ? text : `${text.slice(0, length - 3).trim()}...`;
};

const absoluteUrl = (url) => {
  if (!url) return null;
  return url.startsWith("http")
    ? url
    : `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

const productImage = (product) => {
  const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
  if (typeof firstImage === "string") return absoluteUrl(firstImage);
  if (firstImage && typeof firstImage === "object") {
    return absoluteUrl(
      firstImage.image_url ?? firstImage.image ?? firstImage.url,
    );
  }
  return DEFAULT_IMAGE;
};

const renderPage = ({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
  productSchema = null,
}) => {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  const safeImage = escapeHtml(image);
  const jsonLd = productSchema
    ? `<script type="application/ld+json">${JSON.stringify(productSchema)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="${noIndex ? "noindex, nofollow" : "index, follow"}">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:site_name" content="HA Furniture">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  ${jsonLd}
</head>
<body>
  <main><h1>${safeTitle}</h1><p>${safeDescription}</p></main>
</body>
</html>`;
};

export default async function handler(req, res) {
  const type = firstValue(req.query.type) || "product";
  const slug = firstValue(req.query.slug);
  const userAgent = req.headers["user-agent"] || "";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const requestOrigin = host ? `${protocol}://${host}` : SITE_ORIGIN;

  if (!BOT_PATTERN.test(userAgent)) {
    try {
      const spaResponse = await fetch(`${requestOrigin}/index.html`);
      if (!spaResponse.ok) throw new Error(`SPA request failed: ${spaResponse.status}`);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(await spaResponse.text());
    } catch (error) {
      console.error("Unable to serve the SPA shell", error);
      return res.status(500).send("Unable to load the application.");
    }
  }

  try {
    let page = {
      title: "HA Furniture | Furniture in Egypt",
      description:
        "Discover sofas, bedrooms, dining rooms, and modern home furniture from HA Furniture in Egypt.",
      canonical: `${SITE_ORIGIN}/`,
    };

    if (type === "product" && slug) {
      const productResponse = await fetch(
        `${API_ORIGIN}/api/catalog/products/${encodeURIComponent(slug)}/`,
      );
      if (!productResponse.ok) {
        return res.status(404).send("Product not found");
      }

      const product = await productResponse.json();
      const canonical = `${SITE_ORIGIN}/product/${encodeURIComponent(product.slug || slug)}`;
      const image = productImage(product);
      const price = Number(product.final_price);
      page = {
        title: `${product.title} | HA Furniture`,
        description: truncate(
          `${product.title}. ${product.description || "Furniture from HA Furniture in Egypt."}`,
        ),
        canonical,
        image,
        type: "product",
        productSchema: {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: truncate(product.description || product.title),
          image: [image],
          sku: String(product.id),
          category: product.category_name || undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "EGP",
            price: Number.isFinite(price) ? price : undefined,
            availability:
              product.is_available === false
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
            url: canonical,
          },
        },
      };
    } else if (type === "category" && slug) {
      const categoriesResponse = await fetch(`${API_ORIGIN}/api/catalog/categories/`);
      const categories = categoriesResponse.ok ? await categoriesResponse.json() : [];
      const category = Array.isArray(categories)
        ? categories.find((item) => item.slug === slug)
        : null;
      const categoryName = category?.name || String(slug).replace(/-/g, " ");
      page = {
        title: `${categoryName} Furniture | HA Furniture`,
        description: `Explore ${categoryName} furniture from HA Furniture in Egypt.`,
        canonical: `${SITE_ORIGIN}/category/${encodeURIComponent(slug)}`,
        image: absoluteUrl(category?.image) || DEFAULT_IMAGE,
      };
    } else if (type === "products") {
      page = {
        title: "Furniture Collection | HA Furniture",
        description:
          "Explore HA Furniture collections in Egypt: sofas, bedrooms, dining rooms, and modern home furniture.",
        canonical: `${SITE_ORIGIN}/products`,
      };
    } else if (type === "about") {
      page = {
        title: "About HA Furniture",
        description:
          "Learn about HA Furniture and browse furniture selected for modern homes in Egypt.",
        canonical: `${SITE_ORIGIN}/about`,
      };
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(renderPage(page));
  } catch (error) {
    console.error("Unable to generate metadata", error);
    return res.status(500).send("Unable to generate page metadata.");
  }
}
