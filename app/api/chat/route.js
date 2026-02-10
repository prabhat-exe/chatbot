export async function POST(req) {
  const body = await req.json();
  const sessionId = body.session_id || 'anonymous';

  const res = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      message: body.message,
      session_id: sessionId
    })
  });

  const apiData = await res.json();
  // console.log("API Data:", apiData.data);

  const products = apiData?.data?.products;

  // CASE 1: NO PRODUCTS → PASS THROUGH
  if (!products || products.length === 0) {
    return Response.json({
      intent: apiData.intent,
      reply: apiData.response,
      category_data: apiData.category_data || [],
      categories: apiData.categories || []
    });
  }

  //  CASE 2: PRODUCTS EXIST → BUILD MENU
  const categoryMap = {};

  products.forEach((p) => {
    const product = p;
    if (!categoryMap[product.category_id]) {
      categoryMap[product.category_id] = {
        category_id: product.category_id,
        name: product.category,
        sub_category_data: [
          {
            menu_id: product.category_id,
            name: product.category,
            item_data: [],
            tax_class: product.tax_class || "none",
            map_tax_class: product.map_tax_class || "none",
          }
        ]
      };
    }

    categoryMap[product.category_id].sub_category_data[0].item_data.push({
      item_id: product.product_id,
      name: product.product_name,
      price: product.price,
      image: product.image_url,
      is_chef_special: product.is_chef_special,
      is_veg: product.item_type === "vegetarian" ? true : false,
      variation_status: product.variation_status || 0,
      variations: product.variations || [],
      addons_status: product.addons_status || 0,
      addons: product.addons || []
    });
  });
  const categoryData = Object.values(categoryMap);

  return Response.json({
    intent: apiData.intent,
    reply: apiData.response,
    category_data: categoryData,
    categories: apiData.categories || [],
    apiData: apiData
  });
}