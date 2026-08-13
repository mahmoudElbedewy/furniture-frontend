const API_ORIGIN = "https://mahmoudelbedewy-fureniture.hf.space";
const SITE_ORIGIN = "https://myhomestyle.store";
const LOGO_IMAGE =
  "https://res.cloudinary.com/dlsrs0ir9/image/upload/v1786657806/site_assets/home-style-og-logo.jpg";
const DEFAULT_IMAGE = LOGO_IMAGE;

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const productIdFromShareCode = (shareCode) => {
  if (!shareCode) return null;
  if (UUID_PATTERN.test(shareCode)) return shareCode;
  if (!/^[A-Za-z0-9_-]{22}$/.test(shareCode)) return null;

  const hex = Buffer.from(
    `${shareCode.replaceAll("-", "+").replaceAll("_", "/")}==`,
    "base64",
  ).toString("hex");
  if (hex.length !== 32) return null;

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

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
  const images = Array.isArray(product?.images) ? product.images : [];
  const primaryImage = images.find(
    (image) => image && typeof image === "object" && image.is_primary,
  );
  const image = primaryImage ?? images[0];
  if (typeof image === "string") return absoluteUrl(image);
  if (image && typeof image === "object") {
    return absoluteUrl(
      image.image_url ?? image.image ?? image.url,
    );
  }
  return DEFAULT_IMAGE;
};

const renderMetadata = ({
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
  const isLogoImage = image === LOGO_IMAGE;
  const imageDetails = isLogoImage
    ? `
  <meta property="og:image:url" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">`
    : `
  <meta property="og:image:url" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">`;
  const jsonLd = productSchema
    ? `<script type="application/ld+json">${JSON.stringify(productSchema)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")}</script>`
    : "";

  return `
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="${noIndex ? "noindex, nofollow" : "index, follow"}">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:site_name" content="Home Style">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:alt" content="${safeTitle}">
  ${imageDetails}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  <meta name="twitter:image:alt" content="${safeTitle}">
  ${jsonLd}`;
};

const renderStorefrontPage = (spaHtml, page) => {
  const withoutStaticMetadata = spaHtml
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\b[^>]*\bname=["']description["'][^>]*>\s*/gi, "")
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(
      /<meta\b[^>]*(?:\bproperty=["']og:[^"']+["']|\bname=["']twitter:[^"']+["'])[^>]*>\s*/gi,
      "",
    );

  return withoutStaticMetadata.replace(
    /<\/head>/i,
    `${renderMetadata(page)}\n</head>`,
  );
};

export default async function handler(req, res) {
  const type = firstValue(req.query.type) || "product";
  const slug = firstValue(req.query.slug);
  const productId = productIdFromShareCode(firstValue(req.query.id));
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const requestOrigin = host ? `${protocol}://${host}` : SITE_ORIGIN;

  try {
    if (type === "product-id" && !productId) {
      return res.status(404).send("Product not found");
    }

    let page = {
      title: "Home Style | Furniture in Egypt",
      description:
        "Discover sofas, bedrooms, dining rooms, and modern home furniture from Home Style in Egypt.",
      canonical: `${SITE_ORIGIN}/`,
      image: LOGO_IMAGE,
    };

    if ((type === "product" && slug) || (type === "product-id" && productId)) {
      const productEndpoint =
        type === "product-id"
          ? `/api/catalog/products/id/${encodeURIComponent(productId)}/`
          : `/api/catalog/products/${encodeURIComponent(slug)}/`;
      const productResponse = await fetch(
        `${API_ORIGIN}${productEndpoint}`,
      );
      if (!productResponse.ok) {
        return res.status(404).send("Product not found");
      }

      const product = await productResponse.json();
      const canonical = `${SITE_ORIGIN}/product/${encodeURIComponent(product.slug || slug)}`;
      const image = productImage(product);
      const price = Number(product.final_price);
      page = {
        title: `${product.title} | Home Style`,
        description: truncate(
          `${product.title}. ${product.description || "Furniture from Home Style in Egypt."}`,
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
        title: `${categoryName} Furniture | Home Style`,
        description: `Explore ${categoryName} furniture from Home Style in Egypt.`,
        canonical: `${SITE_ORIGIN}/category/${encodeURIComponent(slug)}`,
        image: absoluteUrl(category?.image) || DEFAULT_IMAGE,
      };
    } else if (type === "products") {
      page = {
        title: "Furniture Collection | Home Style",
        description:
          "Explore Home Style collections in Egypt: sofas, bedrooms, dining rooms, and modern home furniture.",
        canonical: `${SITE_ORIGIN}/products`,
      };
    } else if (type === "about") {
      page = {
        title: "About Home Style",
        description:
          "Learn about Home Style and browse furniture selected for modern homes in Egypt.",
        canonical: `${SITE_ORIGIN}/about`,
      };
    }

    const spaResponse = await fetch(`${requestOrigin}/index.html`);
    if (!spaResponse.ok) {
      throw new Error(`SPA request failed: ${spaResponse.status}`);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
    );
    return res.status(200).send(
      renderStorefrontPage(await spaResponse.text(), page),
    );
  } catch (error) {
    console.error("Unable to generate metadata", error);
    return res.status(500).send("Unable to generate page metadata.");
  }
}
