// src/barcodeLookup.js
// Looks up a UPC/EAN barcode against Open Food Facts (free, no API key needed)
// Falls back gracefully if product not found

const CATEGORY_MAP = {
  "cereals-and-potatoes":    "Grains & Pasta",
  "grains":                  "Grains & Pasta",
  "pasta":                   "Grains & Pasta",
  "rice":                    "Grains & Pasta",
  "bread":                   "Grains & Pasta",
  "canned":                  "Canned Goods",
  "tinned":                  "Canned Goods",
  "soups":                   "Canned Goods",
  "sauces":                  "Spices & Condiments",
  "condiments":              "Spices & Condiments",
  "spices":                  "Spices & Condiments",
  "seasonings":              "Spices & Condiments",
  "snacks":                  "Snacks",
  "chips":                   "Snacks",
  "crackers":                "Snacks",
  "cookies":                 "Snacks",
  "biscuits":                "Snacks",
  "baking":                  "Baking",
  "flour":                   "Baking",
  "sugar":                   "Baking",
  "beverages":               "Beverages",
  "drinks":                  "Beverages",
  "juices":                  "Beverages",
  "sodas":                   "Beverages",
  "waters":                  "Beverages",
  "frozen":                  "Frozen",
  "dairy":                   "Dairy",
  "milk":                    "Dairy",
  "cheese":                  "Dairy",
  "yogurt":                  "Dairy",
  "produce":                 "Produce",
  "fruits":                  "Produce",
  "vegetables":              "Produce",
};

function mapCategory(openFoodFactsCategories) {
  if (!openFoodFactsCategories) return "Other";
  const tags = openFoodFactsCategories.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (tags.includes(key)) return val;
  }
  return "Other";
}

export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return { found: false };
    }

    const p = data.product;

    const name = p.product_name_en || p.product_name || p.abbreviated_product_name || "";
    const brand = p.brands?.split(",")[0]?.trim() || "";
    const displayName = brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${name}`.trim()
      : name;

    const quantity = p.quantity || "";           // e.g. "400g" or "12 fl oz"
    const category = mapCategory(p.categories_tags?.join(" ") || p.categories || "");
    const imageUrl = p.image_front_small_url || p.image_url || null;

    return {
      found: true,
      name: displayName,
      category,
      quantity,   // raw quantity string for reference
      imageUrl,
      brand,
    };
  } catch {
    return { found: false };
  }
}
