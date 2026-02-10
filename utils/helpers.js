// Helper function to get all items from menu data
export const getItemsFromMenuData = (menuData) => {
  const items = [];
  menuData.category_data.forEach((category) => {
    category.sub_category_data.forEach((subCategory) => {
      subCategory.item_data.forEach((item) => {
        items.push({
          ...item,
          is_customizable: true, // All items are customizable
          category_id: subCategory.menu_id, // Add category_id for tax calculation
        });
      });
    });
  });
  return items;
};

/**
 * Calculate tax details from a sub-category's tax structure
 * @param {number} price - Base price of the item
 * @param {array} map_tax_class - Tax mapping array from the category
 * @returns {object} - Tax breakdown object
 */
export const calculateTaxFromSubCategory = (price, map_tax_class) => {
  const taxDetails = {
    base_price: price,
    taxes: [],
    total_tax: 0,
    final_price: price,
  };

  if (!map_tax_class || !Array.isArray(map_tax_class)) {
    return taxDetails;
  }

  // Calculate individual taxes
  map_tax_class.forEach((taxMapping) => {
    if (taxMapping.tax_rate && taxMapping.tax_rate[0]) {
      const taxRate = taxMapping.tax_rate[0];
      const taxAmount = (price * taxRate.tax_amount) / 100;

      taxDetails.taxes.push({
        name: taxRate.tax_name,
        percentage: taxRate.tax_amount,
        amount: parseFloat(taxAmount.toFixed(2)),
        type: taxRate.type,
      });

      taxDetails.total_tax += taxAmount;
    }
  });

  taxDetails.total_tax = parseFloat(taxDetails.total_tax.toFixed(2));
  taxDetails.final_price = parseFloat((price).toFixed(2)); // Already included in price for inclusive tax
  // console.log('Calculated tax details:', taxDetails);
  return taxDetails;
};

/**
 * Get tax information for items from menu data
 * @param {object} menuData - Full category data with sub_category_data
 * @returns {object} - Map of category_id to tax info
 */
export const getTaxInfoFromMenuData = (menuData) => {
  const taxInfoMap = {};

  menuData.sub_category_data?.forEach((subCategory) => {
    const categoryId = subCategory.menu_id;
    taxInfoMap[categoryId] = {
      tax_class: subCategory.tax_class,
      map_tax_class: subCategory.map_tax_class,
    };
  });

  return taxInfoMap;
};