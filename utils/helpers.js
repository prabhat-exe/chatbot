// Helper function to get all items from menu data
export const getItemsFromMenuData = (menuData) => {
  const items = [];
  menuData.category_data.forEach((category) => {
    category.sub_category_data.forEach((subCategory) => {
      subCategory.item_data.forEach((item) => {
        items.push({
          ...item,
          is_customizable: true, // All items are customizable
        });
      });
    });
  });
  return items;
};