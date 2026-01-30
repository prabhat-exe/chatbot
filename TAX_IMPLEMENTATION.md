# Tax Display Implementation

This document explains how the tax calculation and display system works in the chatbot application.

## Overview

The application now displays:
- Individual item tax information
- Tax breakdown by type (CGST, SGST, etc.)
- Final price with inclusive taxes

## Data Flow

```
API Response (category_data)
    ↓
ChatContainer → getItemsFromMenuData()
    ↓
Item with category_id
    ↓
CustomizationCard (passes category_id)
    ↓
addToCart() with tax calculation
    ↓
CartSummary displays tax breakdown
```

## Key Functions

### 1. Tax Calculation Helper (`utils/helpers.js`)

#### `calculateTaxFromSubCategory(price, map_tax_class)`
Calculates tax details for a single item.

**Parameters:**
- `price`: Base price of the item
- `map_tax_class`: Tax mapping array from the category

**Returns:**
```javascript
{
  base_price: number,
  taxes: [
    {
      name: "CGST",
      percentage: 2.5,
      amount: 0.50,
      type: "inclusive"
    }
  ],
  total_tax: number,
  final_price: number  // Already included in price for inclusive tax
}
```

### 2. useCart Hook Updates

New methods available:
- `getTotalTax()` - Returns total tax across all items
- `getTaxBreakdown()` - Returns aggregated tax by type
- `setTaxInfo(menuData)` - Stores tax information for categories

## Usage Example

```javascript
// In your component
import { useCart } from '../../hooks/useCart';

function MyComponent() {
  const { 
    cart, 
    getTotalTax, 
    getTaxBreakdown,
    setTaxInfo 
  } = useCart();

  // When menu data arrives
  useEffect(() => {
    if (menuData.sub_category_data) {
      setTaxInfo(menuData.sub_category_data[0]);
    }
  }, [menuData]);

  // Get totals
  const totalTax = getTotalTax();
  const taxBreakdown = getTaxBreakdown();

  // Display tax
  console.log('CGST:', taxBreakdown['CGST']?.amount);
  console.log('SGST:', taxBreakdown['SGST']?.amount);
}
```

## API Response Structure

The tax information comes from the API in this structure:

```json
{
  "sub_category_data": [
    {
      "menu_id": 399,
      "name": "Beverages",
      "item_data": [...],
      "map_tax_class": [
        {
          "tax_rate": [
            {
              "tax_name": "CGST",
              "tax_type": "percentage",
              "tax_amount": 2.5,
              "type": "inclusive"
            }
          ]
        }
      ]
    }
  ]
}
```

## Cart Item Structure

Each item in the cart now includes:

```javascript
{
  item_id: 2385,
  name: "Soft Drinks",
  category_id: 399,  // Used to lookup tax info
  unit_price: 20,
  quantity: 1,
  total_price: 20,
  tax_details: {
    base_price: 20,
    taxes: [
      {
        name: "CGST",
        percentage: 2.5,
        amount: 0.50,
        type: "inclusive"
      },
      {
        name: "SGST",
        percentage: 2.5,
        amount: 0.50,
        type: "inclusive"
      }
    ],
    total_tax: 1.00,
    final_price: 20  // Price already includes tax
  }
}
```

## CartSummary Component

The CartSummary component now displays:

1. **Individual Item Taxes**: Shows tax percentages for each item
2. **Tax Breakdown Section**: Shows aggregated taxes by type
3. **Final Price**: Total including all taxes

```jsx
<CartSummary
  cart={cart}
  onRemoveItem={removeFromCart}
  onUpdateQuantity={updateQuantity}
  getTotalTax={getTotalTax}        // Function to calculate total tax
  getTaxBreakdown={getTaxBreakdown} // Function to get tax breakdown
  {...otherProps}
/>
```

## Notes

- Prices in the API response already include the tax for "inclusive" type taxes
- `final_price` in `tax_details` equals `base_price` (the tax is embedded)
- Multiple tax types (CGST, SGST, etc.) are calculated separately
- Tax calculations are rounded to 2 decimal places

## Example Output

For a cart with:
- Soft Drinks (₹20 with 5% GST)
- Water Bottle (₹20 with 5% GST)
- Quantity: 1 each

CartSummary will display:
```
Subtotal:  ₹38.10
CGST (2.5%):  ₹1.00
SGST (2.5%):  ₹1.00
─────────────
Total:     ₹40.10
```

(Note: Actual amounts depend on how your backend calculates the prices)
