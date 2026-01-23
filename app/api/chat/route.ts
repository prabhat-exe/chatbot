export async function POST(req: Request) {
  const body = await req.json();

  const res = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ message: body.message })
  });

  const apiData = await res.json();
  // console.log("API Data:", apiData);
  
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
  const categoryMap: any = {};

  products.forEach((p: any) => {
    if (!categoryMap[p.category_id]) {
      categoryMap[p.category_id] = {
        category_id: p.category_id,
        name: p.category,
        sub_category_data: [
          {
            menu_id: p.category_id,
            name: p.category,
            item_data: []
          }
        ]
      };
    }

    categoryMap[p.category_id].sub_category_data[0].item_data.push({
      item_id: p.product_id,
      name: p.product_name,
      price: p.price,
      image: p.image_url,
      is_chef_special: p.is_chef_special,
      is_veg: p.item_type === "vegetarian" ? true : false,
      variation_status: p.variation_status || 0,
      variations: p.variations || []
    });
  });
  const categoryData = Object.values(categoryMap);

  return Response.json({
    intent: apiData.intent,
    reply: apiData.response,
    category_data: categoryData,
    categories: apiData.categories || [],
  });
}
