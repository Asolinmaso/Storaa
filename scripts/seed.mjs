// Seeds stores and products. Run with: npm run seed
import { readFileSync } from "fs";
import mongoose from "mongoose";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const MONGODB_URI = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!MONGODB_URI) throw new Error("MONGODB_URI not found in .env.local");

await mongoose.connect(MONGODB_URI);

const Store = mongoose.model(
  "Store",
  new mongoose.Schema({}, { strict: false, timestamps: true })
);
const Product = mongoose.model(
  "Product",
  new mongoose.Schema({}, { strict: false, timestamps: true })
);

await Store.deleteMany({});
await Product.deleteMany({});

const demoStores = [
  { name: "FreshMart Grocery", category: "Groceries", emoji: "🛒", color: "#e8f5e9", rating: 4.8, distanceKm: 0.8, isOpen: true, hoursLabel: "Open -  Closes at 10 PM", owner: "Rohan Mehta", address: "Gandhi chowk, ABC Road, Chennai, Tamilnadu - 434001", shortAddress: "ABC Road, Chennai - 434001", phone: "9478567893", email: "Rohan@gmail.com", website: "https://freshmart.example.com", featured: true, reviewCount: 32 },
  { name: "ElectroHub", category: "Electronics", emoji: "🔌", color: "#e3f2fd", rating: 4.7, distanceKm: 2.8, isOpen: false, hoursLabel: "Closed -  Opens at 10 AM", owner: "Vikram Rao", address: "12, Anna Salai, Chennai, Tamilnadu - 600002", shortAddress: "Anna Salai, Chennai - 600002", phone: "9812345670", email: "electrohub@gmail.com", website: "https://electrohub.example.com", featured: true, reviewCount: 21 },
  { name: "StyleWear", category: "Fashion", emoji: "👗", color: "#fff3e0", rating: 4.7, distanceKm: 3.0, isOpen: false, hoursLabel: "Closed - Opens at 10.30 AM", owner: "Meera Nair", address: "45, T. Nagar, Chennai, Tamilnadu - 600017", shortAddress: "T. Nagar, Chennai - 600017", phone: "9922334455", email: "stylewear@gmail.com", website: "https://stylewear.example.com", featured: true, reviewCount: 18 },
  { name: "SnackZone", category: "Snacks & Beverages", emoji: "🍿", color: "#fff8e1", rating: 4.8, distanceKm: 0.5, isOpen: true, hoursLabel: "Open -  Closes 10 PM", owner: "Arjun Iyer", address: "3, Usman Rd, Chennai, Tamilnadu - 600017", shortAddress: "Usman Rd, Chennai - 600017", phone: "9765432109", email: "snackzone@gmail.com", website: "https://snackzone.example.com", featured: true, reviewCount: 27 },
  { name: "Green Basket", category: "Fruits & Vegetables", emoji: "🥦", color: "#e8f5e9", rating: 4.6, distanceKm: 1.2, isOpen: true, hoursLabel: "Open -  Closes 10 PM", owner: "Lakshmi Devi", address: "8, Bazullah Rd, Chennai, Tamilnadu - 600017", shortAddress: "Bazullah Rd, Chennai - 600017", phone: "9345678120", email: "greenbasket@gmail.com", website: "https://greenbasket.example.com", featured: true, reviewCount: 14 },
  { name: "Ghar Sansar", category: "Home Essentials", emoji: "🏠", color: "#f3e5f5", rating: 4.5, distanceKm: 1.2, isOpen: true, hoursLabel: "Open -  Closes 9 PM", owner: "Suresh Kumar", address: "21, G.N. Chetty Rd, Chennai, Tamilnadu - 600006", shortAddress: "G.N. Chetty Rd, Chennai - 600006", phone: "9123456780", email: "gharsansar@gmail.com", website: "https://gharsansar.example.com", featured: false, reviewCount: 11 },
  { name: "Ashok Kirana", category: "Groceries", emoji: "🏪", color: "#fbe9e7", rating: 4.4, distanceKm: 0.8, isOpen: true, hoursLabel: "Open -  Closes at 10 PM", owner: "Ashok Patel", address: "5, Pantheon Rd, Chennai, Tamilnadu - 600008", shortAddress: "Pantheon Rd, Chennai - 600008", phone: "9098765432", email: "ashokkirana@gmail.com", website: "", featured: false, reviewCount: 9 },
  { name: "Durga Store", category: "Groceries", emoji: "🛍️", color: "#ede7f6", rating: 4.3, distanceKm: 2.8, isOpen: false, hoursLabel: "Closed -  Opens at 10 AM", owner: "Durga Prasad", address: "17, EVR Periyar Salai, Chennai - 600010", shortAddress: "EVR Periyar Salai, Chennai", phone: "9876501234", email: "durgastore@gmail.com", website: "", featured: false, reviewCount: 7 },
];

const stores = await Store.insertMany(
  demoStores.map((s) => ({ ...s, status: "approved" }))
);

const byName = Object.fromEntries(stores.map((s) => [s.name, s._id]));

await Product.insertMany([
  // FreshMart Grocery
  { storeId: byName["FreshMart Grocery"], name: "Amul Milk", category: "Dairy & Eggs", emoji: "🥛", price: 62, unit: "Liter", rating: 4.8, reviewCount: 120 },
  { storeId: byName["FreshMart Grocery"], name: "Corn Flacks", category: "Groceries", emoji: "🥣", price: 30, unit: "Kg", rating: 4.8, reviewCount: 44 },
  { storeId: byName["FreshMart Grocery"], name: "Jaggery Powder", category: "Groceries", emoji: "🟤", price: 249, unit: "Kg", rating: 4.8, reviewCount: 31 },
  { storeId: byName["FreshMart Grocery"], name: "Peanut Butter", category: "Groceries", emoji: "🥜", price: 110, unit: "300g", rating: 4.8, reviewCount: 52 },
  { storeId: byName["FreshMart Grocery"], name: "Sunflower Oil", category: "Groceries", emoji: "🌻", price: 195, unit: "Liter", rating: 4.8, reviewCount: 63 },
  { storeId: byName["FreshMart Grocery"], name: "Basamati Rice", category: "Groceries", emoji: "🍚", price: 135, unit: "Kg", rating: 4.8, reviewCount: 40 },
  // Other grocery stores
  { storeId: byName["Ashok Kirana"], name: "Sunflower Oil", category: "Groceries", emoji: "🌻", price: 200, unit: "Liter", rating: 4.5, reviewCount: 12 },
  { storeId: byName["Durga Store"], name: "Soybeans", category: "Groceries", emoji: "🫘", price: 20, unit: "500g", rating: 4.4, reviewCount: 8 },
  { storeId: byName["FreshMart Grocery"], name: "Whole wheat Flour", category: "Groceries", emoji: "🌾", price: 30, unit: "Kg", rating: 4.6, reviewCount: 19 },
  { storeId: byName["Ashok Kirana"], name: "Basamati Rice", category: "Groceries", emoji: "🍚", price: 200, unit: "Kg", rating: 4.5, reviewCount: 15 },
  { storeId: byName["Green Basket"], name: "Jaggery Powder", category: "Groceries", emoji: "🟤", price: 150, unit: "Kg", rating: 4.4, reviewCount: 10 },
  { storeId: byName["Ashok Kirana"], name: "Peanut Butter", category: "Groceries", emoji: "🥜", price: 80, unit: "300g", rating: 4.4, reviewCount: 9 },
  { storeId: byName["Durga Store"], name: "Poha", category: "Groceries", emoji: "🍛", price: 80, unit: "Kg", rating: 4.3, reviewCount: 6 },
  { storeId: byName["Durga Store"], name: "Rava (Suji)", category: "Groceries", emoji: "🥣", price: 80, unit: "Kg", rating: 4.3, reviewCount: 5 },
  { storeId: byName["Ashok Kirana"], name: "Moong Dal", category: "Groceries", emoji: "🫛", price: 80, unit: "Kg", rating: 4.5, reviewCount: 11 },
  { storeId: byName["Green Basket"], name: "Corn Flacks", category: "Groceries", emoji: "🥣", price: 60, unit: "Kg", rating: 4.4, reviewCount: 7 },
  // Fruits & Vegetables
  { storeId: byName["Green Basket"], name: "Fresh Tomatoes", category: "Fruits & Vegetables", emoji: "🍅", price: 40, unit: "Kg", rating: 4.6, reviewCount: 22 },
  { storeId: byName["Green Basket"], name: "Bananas", category: "Fruits & Vegetables", emoji: "🍌", price: 55, unit: "Dozen", rating: 4.7, reviewCount: 18 },
  { storeId: byName["Green Basket"], name: "Spinach Bunch", category: "Fruits & Vegetables", emoji: "🥬", price: 25, unit: "Bunch", rating: 4.5, reviewCount: 9 },
  // Electronics
  { storeId: byName["ElectroHub"], name: "Bluetooth Speaker", category: "Electronics", emoji: "🔊", price: 1499, unit: "Piece", rating: 4.7, reviewCount: 35 },
  { storeId: byName["ElectroHub"], name: "Wireless Mouse", category: "Electronics", emoji: "🖱️", price: 649, unit: "Piece", rating: 4.6, reviewCount: 27 },
  { storeId: byName["ElectroHub"], name: "USB-C Charger", category: "Electronics", emoji: "🔌", price: 899, unit: "Piece", rating: 4.7, reviewCount: 31 },
  // Snacks & Beverages
  { storeId: byName["SnackZone"], name: "Potato Chips", category: "Snacks", emoji: "🥔", price: 20, unit: "Pack", rating: 4.8, reviewCount: 41 },
  { storeId: byName["SnackZone"], name: "Cold Coffee", category: "Beverages", emoji: "🧋", price: 60, unit: "Bottle", rating: 4.6, reviewCount: 12 },
  { storeId: byName["SnackZone"], name: "Salted Peanuts", category: "Snacks", emoji: "🥜", price: 35, unit: "Pack", rating: 4.5, reviewCount: 16 },
  // Fashion
  { storeId: byName["StyleWear"], name: "Cotton T-Shirt", category: "Fashion", emoji: "👕", price: 499, unit: "Piece", rating: 4.7, reviewCount: 23 },
  { storeId: byName["StyleWear"], name: "Denim Jeans", category: "Fashion", emoji: "👖", price: 1299, unit: "Piece", rating: 4.6, reviewCount: 17 },
  // Home Essentials (Ghar Sansar — used in "Suggested For You")
  { storeId: byName["Ghar Sansar"], name: "Milton Thermosteel Water Bottle", category: "Home Essentials", emoji: "🍾", price: 499, unit: "1 pcs", rating: 4.6, reviewCount: 14 },
  { storeId: byName["Ghar Sansar"], name: "Storage Container Set", category: "Home Essentials", emoji: "🫙", price: 899, unit: "6 pcs", rating: 4.5, reviewCount: 10 },
  { storeId: byName["Ghar Sansar"], name: "Anti Slip Entrance Door Mat", category: "Home Essentials", emoji: "🚪", price: 349, unit: "2 pcs", rating: 4.4, reviewCount: 8 },
  { storeId: byName["Ghar Sansar"], name: "Premium Wooden Cutting Board", category: "Home Essentials", emoji: "🪵", price: 599, unit: "6 pcs", rating: 4.6, reviewCount: 12 },
]);

const storeCount = await Store.countDocuments();
const productCount = await Product.countDocuments();
console.log(`Seeded ${storeCount} stores and ${productCount} products.`);
await mongoose.disconnect();
