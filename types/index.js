/**
 * @typedef {Object} Variation
 * @property {number} variation_id
 * @property {string} variation_name
 * @property {string} variation_price
 */

/**
 * @typedef {Object} MenuItem
 * @property {number} item_id
 * @property {string} name
 * @property {number} price
 * @property {string} image
 * @property {boolean} is_chef_special
 * @property {boolean} is_veg
 * @property {boolean} [is_customizable]
 * @property {string} [description]
 * @property {number} variation_status
 * @property {Variation[]} variations
 * @property {number} addons_status
 * @property {Array} addons
 */

/**
 * @typedef {Object} OrderItem
 * @property {number} item_id
 * @property {string} name
 * @property {Object|null} selected_variation
 * @property {number} selected_variation.variation_id
 * @property {string} selected_variation.variation_name
 * @property {number} selected_variation.variation_price
 * @property {Array} addons
 * @property {number} unit_price
 * @property {number} quantity
 * @property {number} total_price
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {"user"|"assistant"} role
 * @property {string} text
 * @property {MenuData} [menuData]
 * @property {CategoryItem[]} [categories]
 * @property {string} [component]
 * @property {MenuItem} [selectedItem]
 */

/**
 * @typedef {Object} CategoryItem
 * @property {string} category_name
 * @property {number} item_count
 */

/**
 * @typedef {Object} MenuData
 * @property {Array} category_data
 */

/**
 * @typedef {Object} Addon
 * @property {number} addon_id
 * @property {string} addon_name
 * @property {number} price
 */

// Export empty object for compatibility
module.exports = {};