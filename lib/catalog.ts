export interface Category {
  name: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { name: "Groceries", emoji: "🛒" },
  { name: "Fruits & Vegetables", emoji: "🥦" },
  { name: "Electronics", emoji: "📱" },
  { name: "Snacks", emoji: "🍿" },
  { name: "Personal care", emoji: "🧴" },
  { name: "Fashion", emoji: "👜" },
  { name: "Kitchen & Appliances", emoji: "🍳" },
  { name: "Home Essentials", emoji: "🏠" },
  { name: "Pet Care", emoji: "🐾" },
  { name: "Stationery", emoji: "✏️" },
  { name: "Baby Care", emoji: "🍼" },
  { name: "Beverages", emoji: "🥤" },
  { name: "Health & Wellness", emoji: "💊" },
  { name: "Dairy & Eggs", emoji: "🥛" },
  { name: "Sports & Fitness", emoji: "🏋️" },
  { name: "Furniture", emoji: "🛋️" },
  { name: "Jewelry", emoji: "💍" },
  { name: "Garden Essentials", emoji: "🪴" },
];

export const HOME_CATEGORY_COUNT = 8;
