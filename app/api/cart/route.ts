import { NextRequest, NextResponse } from 'next/server';
import { OrderItem } from '@/types';

// POST /api/cart/add - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const orderItem: OrderItem = await request.json();

    // Validate the order item structure
    if (!orderItem.item_id || !orderItem.name || orderItem.quantity < 1) {
      return NextResponse.json(
        { error: 'Invalid order item data' },
        { status: 400 }
      );
    }

    // For now, just log the cart addition (backend integration pending)
    console.log('Cart item added:', {
      item_id: orderItem.item_id,
      name: orderItem.name,
      selected_variation: orderItem.selected_variation,
      addons: orderItem.addons,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      total_price: orderItem.total_price,
      timestamp: new Date().toISOString()
    });

    // TODO: Send to actual backend when ready
    // const backendResponse = await fetch('http://127.0.0.1:8000/cart/add', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(orderItem)
    // });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Item added to cart successfully',
      orderItem: orderItem
    });

  } catch (error) {
    console.error('Cart API error:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

// GET /api/cart - Get current cart (placeholder for future)
export async function GET() {
  // TODO: Fetch cart from backend when implemented
  return NextResponse.json({
    cart: [],
    message: 'Cart retrieval not yet implemented'
  });
}