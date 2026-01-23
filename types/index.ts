export interface Variation {
  variation_id: number;
  variation_name: string;
  variation_price: string;
}

export interface MenuItem {
  item_id: number;
  name: string;
  price: number;
  image: string;
  is_chef_special: boolean;
  is_veg: boolean;
  is_customizable?: boolean;
  description?: string;
  variation_status: number;
  variations: Variation[];
  addons_status: number;
  addons: Array<{
    addon_id: number;
    name: string;
    addon_item_id:number;
    image_url: string;
    price: number;
    offered_price: number;
  }>;
}

export interface OrderItem {
  item_id: number;
  name: string;
  selected_variation: {
    variation_id: number;
    variation_name: string;
    variation_price: number;
  } | null;
  addons: {
    addon_id: number;
    addon_name: string;
    price: number;
  }[];
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  menuData?: MenuData;
  categories?: CategoryItem[];
  component?:
    | "menu-cards"
    | "customization"
    | "cart-confirm"
    | "delivery-options"
    | "time-selection"
    | "payment-options"
    | "order-confirmed";
  selectedItem?: MenuItem;
}

export interface CategoryItem {
  category_name: string;
  item_count: number;
}

export interface MenuData {
  category_data: Array<{
    category_id: number;
    name: string;
    sub_category_data: Array<{
      menu_id: number;
      name: string;
      item_data: MenuItem[];
    }>;
  }>;

}

export interface Addon {
  addon_id: number;
  addon_name: string;
  price: number;
}
