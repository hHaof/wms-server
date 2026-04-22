/**
 * import-orders.js
 * Run once: node scripts/import-orders.js
 *
 * Imports custom shirt orders from JSON into MongoDB.
 * - Creates a placeholder "Custom Shirt" product if it doesn't exist
 * - Inserts all orders with status = "shipped"
 * - Skips cancelled orders
 */

require('dotenv').config(); // reads .env from project root
const mongoose = require('mongoose');

// ─── Inline schema (avoid circular imports) ───────────────────────────────────

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'shipped' },
    statusHistory: [new mongoose.Schema({ status: String, note: String }, { timestamps: true })],
    assignedPacker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true },
    shippingInfo: {
      size: { type: String, trim: true },
      designLink: { type: String, trim: true },
      mockupLink: { type: String, trim: true },
      labelLink: { type: String, trim: true },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema({
  name: String,
  sku: { type: String, unique: true },
  description: String,
  category: String,
  price: Number,
  unit: { type: String, default: 'piece' },
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
});

// Use existing models or create new ones
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

// ─── Raw data ─────────────────────────────────────────────────────────────────

const RAW_ORDERS = [
  { "date": "06/03/2026", "name": "Elisabeth Hansen", "phone": "2314201591", "street": "6587 Davies Ave", "city": "ONAWAY", "state": "MI", "zip": "49765", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/file/d/1UG4e-QKiOFcMx3V63-5OVxqi3LUD9GYF/view?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1y0Bj9Dzo3PLkCiWpg-wcb8rw7l-AyVd4/view", "label_link": "https://drive.google.com/drive/folders/1Nnomvlt9t8TgIwW1WDj7-IaXaJkPZ0QC", "status": "Processing" },
  { "date": "10/03/2026", "name": "Kevin Harris", "phone": "2284242064", "street": "2967 Longleaf Dr", "city": "Mobile", "state": "AL", "zip": "36693", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/file/d/1DSee9N40TmRyoCM-DJhUM7OHVWtbefTt/view?usp=sharing", "mockup_link": "https://drive.google.com/file/d/1MzdUwDDrIRIVKQxp_Ic0ePQRLTL3iy5y/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "10/03/2026", "name": "Yared Ruiz", "phone": "4408300135", "street": "2411 Reeves Ave", "city": "Lorain", "state": "OH", "zip": "44052", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/file/d/1pUmK4PuROC2jMGhD5yXS3POqa4Ytz8qG/view?usp=sharing", "mockup_link": "https://drive.google.com/file/d/1xMF2zItoTBbFVmQPTNTS8oQfg7Psiq9w/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "10/03/2026", "name": "Ritchie Morales", "phone": "9546187658", "street": "49 Hampton Rd", "city": "Hamden", "state": "CT", "zip": "6518", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/file/d/1pUmK4PuROC2jMGhD5yXS3POqa4Ytz8qG/view?usp=sharing", "mockup_link": "https://drive.google.com/file/d/1azuYU3usc-XenAXNjlZIWJArSxnjGMfB/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "10/03/2026", "name": "Jonathan Santos", "phone": "9177037531", "street": "875 Melrose Ave Apt 8C", "city": "Bronx", "state": "NY", "zip": "10451", "size": "3XL", "quantity": 1, "design_link": "https://drive.google.com/file/d/1DSee9N40TmRyoCM-DJhUM7OHVWtbefTt/view?usp=sharing", "mockup_link": "https://drive.google.com/file/d/13yFdPOwdZ-bw8faoeZ8NsarvE1waGniY/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "10/03/2026", "name": "pito Miguel Rivera", "phone": "8605059991", "street": "191 Texas dr", "city": "New Britain", "state": "CT", "zip": "6052", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/file/d/1pUmK4PuROC2jMGhD5yXS3POqa4Ytz8qG/view?usp=sharing", "mockup_link": "https://drive.google.com/file/d/1p7fGZKDV-xQQtkx7E8Js7PqrqHC-Zwg_/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "11/03/2026", "name": "Paris Stafford", "phone": "5404296143", "street": "626 LINDEN RD (Harris Hall 121)", "city": "University Park", "state": "PA", "zip": "16802", "size": "S", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TA9kgFQ0SMiK3gpaz2Bp6HIzMM2chph2?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1Vul83YXN77g0Pevx-5h2qnHNb3En-dwI/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "11/03/2026", "name": "Sabrina Aguayo", "phone": "9513176506", "street": "23308 Canyon Pines Pl", "city": "Corona", "state": "CA", "zip": "92883", "size": "M", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1pp5g7lfBgA0LecQQr5UtnxyoggjE0POx?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1cA4HY6NdNgEH9dSEs3vwdcRZwNVg9eaj/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "11/03/2026", "name": "Sixto Reynoso", "phone": "6105706106", "street": "445 Chestnut Cir W", "city": "Alburtis", "state": "PA", "zip": "18011", "size": "XXL", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/19HPPLL1JNs0hqwelYkTPYiEmcc4vVPa-?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1EO8HOyNdCVoMlwpphNANtm0Ol_Tz-eL3/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "15/03/2026", "name": "Krishay Coleman", "phone": "2163151599", "street": "3212 Montclair Ave", "city": "Cleveland", "state": "OH", "zip": "44109", "size": "S", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1oUeVlIUTqehbgYz8ycLeTS9Xt88kKvoW", "mockup_link": "https://drive.google.com/file/d/1R30HWI6nwj0z448J8HEDwHFPiez3rfOv/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "15/03/2026", "name": "Wanda Ortiz-Rodriguez", "phone": "7865712604", "street": "18750 SW 316th Ter", "city": "Homestead", "state": "FL", "zip": "33030", "size": "S", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1YMmPCIiMvLkGavVbJe-t_eOqcYhBOw1S", "mockup_link": "https://drive.google.com/file/d/1bW4VYrZZs2nXVMixmR8khmMwBSYRcJxA/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "16/03/2026", "name": "Alexander Barriod", "phone": "6784586252", "street": "860 Mill Rock Ct", "city": "Lawrenceville", "state": "GA", "zip": "30044", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1oVHbDSDwPVeNW7fbwEbbyO35CMeeKWVx", "mockup_link": "https://drive.google.com/file/d/1oju1X_lFEmK6oA5n1t0SxveSkpwYF4e9/view", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "Junior Collado", "phone": "2106123066", "street": "77 W 14TH ST", "city": "Bayonne", "state": "NJ", "zip": "07002", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1EErWhsr0MUqlsGQ1tmjNRpl8f0LF3ECV?usp=drive_link", "mockup_link": "577312832653923248.pdf", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "felicia amescua", "phone": "6053703214", "street": "600 S Kiwanis Ave Apt 104", "city": "Sioux Falls", "state": "SD", "zip": "57104", "size": "L", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TdD4E0a-vFITL7eabZuL8ySXa1Q7ItVU?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1RXDQSOMHOyI7EPw6eXkloDrelMOFPH-a/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "Ener Martinez", "phone": "4694387262", "street": "5765 Bozeman Dr Apt 2224", "city": "Plano", "state": "TX", "zip": "75024", "size": "M", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1oVHbDSDwPVeNW7fbwEbbyO35CMeeKWVx", "mockup_link": "https://drive.google.com/file/d/1Tc3JJWfvAejYmE6ZZW8UxqPYU4f5xLjJ/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "La blanquita Ropero", "phone": "8483650898", "street": "4193 US HIGHWAY 1 (Casa)", "city": "Monmouth Jct", "state": "NJ", "zip": "8852", "size": "M", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TdD4E0a-vFITL7eabZuL8ySXa1Q7ItVU?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1fzrWArncXE_ZFcRuJ2GKHuAjQy0H3qzz/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "Francy Bastidas Colmenarez", "phone": "6172246956", "street": "310 41st St", "city": "Union City", "state": "NJ", "zip": "07087", "size": "S", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TdD4E0a-vFITL7eabZuL8ySXa1Q7ItVU?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1Vwir4Xa-att9lLYwFxBkKprshiv2cBUQ/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "José Alejandro Pacheco", "phone": "4357205980", "street": "1616 S Dusty Baker Ln # B201", "city": "Heber City", "state": "UT", "zip": "84032", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1oVHbDSDwPVeNW7fbwEbbyO35CMeeKWVx", "mockup_link": "https://drive.google.com/file/d/1NS0vy6q4Pr8i7gQGcnMtHUgqsL6lIqUP/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "Andres Govea", "phone": "2096584990", "street": "275 Murano Street", "city": "Los Banos", "state": "CA", "zip": "93635", "size": "L", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/9c48a901-dac9-4edb-9fd4-25c8b329c648.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/1e5b5c8f-22c0-4b43-ad83-80c7feae908b.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/113294fc-8e3f-47d5-b59f-e7095b674636.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "USER3552919300464 MARTENS", "phone": "8166864613", "street": "3523 NE LACEWOOD CIR", "city": "LEES SUMMIT", "state": "MO", "zip": "64064", "size": "S", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/80dd7aed-f21a-47d5-8c70-5d7d0023474d_S_USA_White.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/be5af9c0-ebf1-4ca2-b641-cc943b67d36c_usa007.png", "label_link": "https://img2.mymerchfox.com/label/9830500/2026_3_19_11_33_11vvprp_label_19_1773894790609_9200190384072905546073.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Carson Eaton", "phone": "9702007518", "street": "215 Palmer St", "city": "Delta", "state": "CO", "zip": "81416", "size": "2XL", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/d33ee5d0-1ac7-4ee8-aa36-806ed7a89de7.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/2ac81b35-c201-4c7f-bf68-12cb00154540.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/99da80a4-d1ef-4396-8be4-a5444901d665.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Andrew Underwood", "phone": "6602879689", "street": "27453 Zeek", "city": "Warsaw", "state": "MO", "zip": "65355", "size": "M", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/70a2e059-945c-4061-a7f3-2f3bc77ec0a6.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/2ac81b35-c201-4c7f-bf68-12cb00154540.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/41bdf4eb-83da-495b-8f1e-114d9c7cd4c8.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Jaden Wright", "phone": "8167162273", "street": "27819 133RD ST", "city": "LEES SUMMIT", "state": "MO", "zip": "64086", "size": "M", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/e8190a13-eb56-4059-88e7-d00f9b726d98.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/2ac81b35-c201-4c7f-bf68-12cb00154540.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/f3df0cf4-f219-4076-91d2-95bbd94e1eaf.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Nic Collins", "phone": "7859259435", "street": "10340 SW 61ST ST", "city": "Topeka", "state": "KS", "zip": "66610", "size": "L", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/272efa62-77f6-4305-9c2f-7b74b4d1994f.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/2ac81b35-c201-4c7f-bf68-12cb00154540.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/dde2ac52-afc1-48dd-8f2c-def9f54c8935.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Rosemary Sambrano", "phone": "5597909055", "street": "2281 E El Paso Ave", "city": "Fresno", "state": "CA", "zip": "93720", "size": "M", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/c8f2c8b3-4948-48c5-93ff-b027b3b93c06.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/9b5a7a14-bda3-436d-bcf9-66bd25d474d4.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/66a8c089-2cc0-4899-aec0-425a5760bb0b.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Francisco Sánchez", "phone": "3125397703", "street": "4857 W Addison ST Casa", "city": "Chicago", "state": "IL", "zip": "60641", "size": "L", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/9c48a901-dac9-4edb-9fd4-25c8b329c648.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/1e5b5c8f-22c0-4b43-ad83-80c7feae908b.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/cc4f09df-85e9-40aa-a201-ccd2e7edf81e.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Nick Gehman", "phone": "6107164778", "street": "5801 Ridge Ave APT 404", "city": "Philadelphia", "state": "PA", "zip": "19128", "size": "L", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/074c9134-7a82-43ce-8808-72e30ce39309.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/c85ef5d7-3177-4f13-96d4-050957def64f.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/356f7314-1209-4497-bb81-3cd16f3cdbda.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Justin Chavez", "phone": "8315126978", "street": "357 Pasque Ave", "city": "Greenfield", "state": "CA", "zip": "93927", "size": "2XL", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/9ff90ca3-2463-4b6b-83d0-2f7f62a93bc0.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/55bba720-9c22-4d5d-8f50-82924f871e16.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/8b0b7027-fa11-461e-b268-7bb3b943282e.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Marcos Ortega", "phone": "7865609176", "street": "1400 Sugarwood St", "city": "Davenport", "state": "FL", "zip": "33837", "size": "S", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/b1630bbb-b2ba-49ef-baa3-50eaeb50023a.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/5b6882b1-b083-434c-aeda-5146c757c713.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/b89d6670-4e9f-4d47-b036-f32815c0ca9e.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Derek Haefner", "phone": "5073174817", "street": "APT 424 9920 Wayzata BLVD", "city": "MINNEAPOLIS", "state": "MN", "zip": "55426", "size": "L", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/9d44ee2d-abd9-4605-ac59-21641d29e17f.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/863a0d18-cf4a-4bee-baae-7ba7f67b8cff.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/2e046c51-b43b-479c-8342-e6a927e3de5d.pdf", "status": "Processing" },
  { "date": "19/03/2026", "name": "Luis Arraiz", "phone": "3853548353", "street": "7654 W Mount Elinor Rd", "city": "Magna", "state": "UT", "zip": "84044", "size": "L", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TdD4E0a-vFITL7eabZuL8ySXa1Q7ItVU?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1N-xg9Nt79Wawvkc1kzy5eqqd0NC0ZlHk/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "Arvenis Arenas", "phone": "9099051006", "street": "3627 Mira Monte Dr (Casa)", "city": "Oceanside", "state": "CA", "zip": "92056", "size": "M", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TdD4E0a-vFITL7eabZuL8ySXa1Q7ItVU?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/17hYUmnTOVgE65atIV72Hwe10WUDe3w9D/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "19/03/2026", "name": "Unknown", "phone": "7869301921", "street": "10950 NW 82ND ST (APT 414)", "city": "Doral", "state": "FL", "zip": "33178", "size": "S", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TdD4E0a-vFITL7eabZuL8ySXa1Q7ItVU?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1g-oZg5KND03tt1S0FhggTT84IfaTeNgk/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "20/03/2026", "name": "andres miranda", "phone": "7869604197", "street": "3205 W 16th Ave Lot B41", "city": "Hialeah", "state": "FL", "zip": "33012", "size": "2XL", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1TdD4E0a-vFITL7eabZuL8ySXa1Q7ItVU?usp=drive_link", "mockup_link": "https://drive.google.com/file/d/1TAJi2KpQe_zeVxgTP2SVnX7eBNnMO32Z/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "20/03/2026", "name": "Luz Tapias", "phone": "9178532840", "street": "30 Fairview Ave Apt 2a", "city": "New York", "state": "NY", "zip": "10040", "size": "S", "quantity": 1, "design_link": null, "mockup_link": "https://drive.google.com/file/d/1n65o9yUOzlKrsCmmXbm1hb-doYlefHHR/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "20/03/2026", "name": "Omarlin Beltran", "phone": "9014565874", "street": "452 Fort Washington Ave (apt 22)", "city": "New York", "state": "NY", "zip": "10033", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1oVHbDSDwPVeNW7fbwEbbyO35CMeeKWVx", "mockup_link": "https://drive.google.com/file/d/1uEeXFgikBizp-2a_Y-rrUuxjJ3hNmWjs/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "27/03/2026", "name": "Herman Lebel", "phone": "2032334243", "street": "3 LAKEVIEW RD", "city": "Prospect", "state": "CT", "zip": "06712", "size": "XL", "quantity": 1, "design_link": null, "mockup_link": "https://drive.google.com/file/d/1gP_0Ocss5YTLbj2Ni_YUyVMZ9Q8BKSK_/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "30/03/2026", "name": "CARLA GONZÁLEZ", "phone": "1111111111", "street": "133 NORTHWOOD DR # SLIDELL # 70458", "city": "Slidell", "state": "LA", "zip": "70458", "size": "S", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/f261acac-e615-432b-8a59-97494f12f99c.png", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/15fd17e0-fa76-4ed7-8500-3a74e5f6b169.png", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/450bd277-a67c-4e0b-9982-be7bc82fe1f5.pdf", "status": "Processing" },
  { "date": "30/03/2026", "name": "MARIA AMAYA", "phone": "1111111111", "street": "2204 E 132ND AVE, APT 201", "city": "TAMPA", "state": "FL", "zip": "33612", "size": "XS", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/8925be6b-abcd-4c4c-8ac4-49dbfed718fb.jpeg", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/f4fc1014-8f8b-4a1c-82b9-118cdb7367d4_z7672343452860_8a1ef15779a93d67b1e31920cb57dd1f.jpg", "label_link": "https://d2hroz1x9vash4.cloudfront.net/labels/54ebdcc1-1133-4a02-8e15-b4d5909328af.pdf", "status": "Processing" },
  { "date": "09/04/2026", "name": "JULIEANNE EASTERLING", "phone": "12345678910", "street": "10 HAZELWOOD CT", "city": "SMITHFIELD", "state": "NC", "zip": "27577", "size": "XL", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/e92ad6b4-2e7a-45d3-b187-2372b4b17c04.jpg", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/ad402fa7-f054-44d2-9889-ef4071e5ce79.jpeg", "label_link": "https://d5rp6401eofn1.cloudfront.net/lables/151dab26-7731-4acb-b1db-cbed888f7202/26998f37-325b-4047-ba80-1b7ed7cb1e18.pdf", "status": "Processing" },
  { "date": "09/04/2026", "name": "JULIEANNE EASTERLING", "phone": "9196249632", "street": "10 HAZELWOOD CT", "city": "SMITHFIELD", "state": "NC", "zip": "27577", "size": "XL", "quantity": 1, "design_link": "https://d2hroz1x9vash4.cloudfront.net/products/e92ad6b4-2e7a-45d3-b187-2372b4b17c04.jpg", "mockup_link": "https://d2hroz1x9vash4.cloudfront.net/products/ad402fa7-f054-44d2-9889-ef4071e5ce79.jpeg", "label_link": "https://d5rp6401eofn1.cloudfront.net/lables/151dab26-7731-4acb-b1db-cbed888f7202/26998f37-325b-4047-ba80-1b7ed7cb1e18.pdf", "status": "Cancelled" },
  { "date": "21/04/2026", "name": "Cristian Serrano", "phone": "9793292691", "street": "712 LAWRENCE ST", "city": "Bryan", "state": "TX", "zip": "77802", "size": "L", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1KUFj3k7chmDxoaC0_f4tBieAH1DsUpQK", "mockup_link": "https://drive.google.com/file/d/1DtVM9A1Tm6jzlWyRGPwZBXGD8QXqqtqf/view?usp=drive_link", "label_link": null, "status": "Processing" },
  { "date": "21/04/2026", "name": "Andres Ravelo", "phone": "5624796956", "street": "10245 LANETT AVE", "city": "Whittier", "state": "CA", "zip": "90605", "size": "XL", "quantity": 1, "design_link": "https://drive.google.com/drive/folders/1KUFj3k7chmDxoaC0_f4tBieAH1DsUpQK", "mockup_link": "https://drive.google.com/file/d/1767stq0tCBQpS3YqZhJrE68GiLyO03PB/view?usp=drive_link", "label_link": null, "status": "Processing" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(str) {
  // Format: DD/MM/YYYY
  const [d, m, y] = str.split('/');
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

function buildAddress(row) {
  return `${row.street}, ${row.city}, ${row.state} ${row.zip}`;
}

function generateOrderNumber(dateStr, index) {
  const [d, m, y] = dateStr.split('/');
  const compact = `${y}${m}${d}`;
  return `ORD-${compact}-IMP${String(index).padStart(3, '0')}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // 1. Find an admin user (or any user) to use as createdBy
  let adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
  if (!adminUser) {
    console.error('❌  No users found. Please create one first via /api/auth/register');
    process.exit(1);
  }
  console.log(`👤  Using admin: ${adminUser.name} (${adminUser._id})`);

  // 2. Find or create placeholder product "Custom Shirt"
  let product = await Product.findOne({ sku: 'CUSTOM-SHIRT' });
  if (!product) {
    product = await Product.create({
      name: 'Custom Shirt',
      sku: 'CUSTOM-SHIRT',
      description: 'Placeholder for custom shirt orders imported from external source',
      category: 'Shirts',
      price: 0,
      unit: 'piece',
      stock: 99999,
      lowStockThreshold: 0,
      isActive: true,
      createdBy: adminUser._id,
    });
    console.log('📦  Created placeholder product: CUSTOM-SHIRT');
  } else {
    console.log('📦  Found existing product: CUSTOM-SHIRT');
  }

  // 3. Import orders
  let imported = 0;
  let skipped = 0;
  let cancelled = 0;

  for (let i = 0; i < RAW_ORDERS.length; i++) {
    const row = RAW_ORDERS[i];

    // Skip cancelled orders
    if (row.status === 'Cancelled') {
      cancelled++;
      console.log(`  ⚠️  Skipping cancelled: ${row.name}`);
      continue;
    }

    const orderNumber = generateOrderNumber(row.date, i + 1);
    const customerName = row.name || 'Unknown Customer';

    // Skip if already imported
    const existing = await Order.findOne({ orderNumber });
    if (existing) {
      skipped++;
      console.log(`  ⏭️  Already exists: ${orderNumber}`);
      continue;
    }

    const orderDate = parseDate(row.date);

    try {
      await Order.create({
        orderNumber,
        customer: {
          name: customerName,
          phone: row.phone || '0000000000',
          address: buildAddress(row),
        },
        items: [{
          product: product._id,
          sku: product.sku,
          name: `Custom Shirt - ${row.size}`,
          price: 0,
          quantity: row.quantity || 1,
          subtotal: 0,
        }],
        totalAmount: 0,
        status: 'shipped',
        statusHistory: [
          { status: 'pending', note: 'Imported from external source' },
          { status: 'packed', note: 'Imported from external source' },
          { status: 'shipped', note: 'Imported from external source' },
        ],
        shippingInfo: {
          size: row.size || '',
          designLink: row.design_link || '',
          mockupLink: row.mockup_link || '',
          labelLink: row.label_link || '',
        },
        note: `Imported order. Size: ${row.size}`,
        createdBy: adminUser._id,
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      imported++;
      console.log(`  ✅  ${orderNumber} — ${customerName}`);
    } catch (err) {
      console.error(`  ❌  Failed: ${orderNumber} — ${err.message}`);
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅  Imported:  ${imported}`);
  console.log(`⏭️  Skipped:   ${skipped} (already exists)`);
  console.log(`⚠️  Cancelled: ${cancelled}`);
  console.log('─────────────────────────────────');

  await mongoose.disconnect();
  console.log('🔌  Disconnected');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
