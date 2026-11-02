/* -------------------------------------------------------------
   PUBG STORE — EDIT THIS FILE ONLY
   Everything below is editable: prices, offers, phone numbers.
   After changing prices, save the file and refresh the website.
------------------------------------------------------------- */

window.STORE_CONFIG = {

  // ---------- Store branding ----------
  storeName: "PUBG Store",
  storeTagline: "Premium Gaming Shop",

  // ---------- Payment (JazzCash) ----------
  // Displayed to customers during checkout. Manual verification only.
  jazzCash: {
    enabled: true,
    accountTitle: "PUBG Store",
    accountNumber: "03293042100",
    // Currency shown on the checkout screen
    currency: "PKR",
    // Shown in the payment instructions step
    instructions: [
      "Open your JazzCash app and tap \"Send Money\".",
      "Enter the account number shown above exactly.",
      "Transfer the exact order amount shown above.",
      "Take a clear screenshot of the successful receipt.",
      "Upload the receipt in the next step of checkout.",
      "Your order stays PENDING until the store owner manually verifies it."
    ]
  },

  // ---------- WhatsApp (order notifications) ----------
  // Number in international format, no '+' and no leading zero.
  whatsapp: {
    number: "923107817304",
    supportText: "Hi! I need help with a PUBG UC order."
  },

  // ---------- Backend (optional) ----------
  // Leave apiBase as "" when the site runs on static hosting (GitHub Pages).
  // Set it to your server origin, e.g. "https://your-server.com", to enable
  // server-side order storage from server.js.
  apiBase: "",

  // ---------- Receipt upload rules ----------
  receipt: {
    maxSizeMB: 5,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    acceptedLabel: "JPG, PNG, WEBP or PDF, max 5 MB"
  },

  // ---------- Delivery promise ----------
  deliveryTime: "5–15 minutes after manual payment verification",

  // ---------- UC Packages ----------
  // price      = what the customer pays (PKR)
  // oldPrice   = optional, shows a discount badge (leave null to hide)
  // badge      = optional label, e.g. "Hot", "Best Value"
  // featured   = true to highlight the card
  // tags       = used by the search/filter bar
  packages: [
    { id: "uc60",    uc: 60,    name: "Starter Pack",  price: 270,   oldPrice: 320,   badge: "Save 16%",  featured: false, tags: ["basic", "cheap", "starter"] },
    { id: "uc325",   uc: 325,   name: "Popular Pack",  price: 1300,  oldPrice: 1450,  badge: "Popular",  featured: false, tags: ["mid", "popular"] },
    { id: "uc660",   uc: 660,   name: "Elite Pack",    price: 2550,  oldPrice: 2850,  badge: "Best Value", featured: true,  tags: ["mid", "value", "elite"] },
    { id: "uc1800",  uc: 1800,  name: "Pro Pack",      price: 6500,  oldPrice: 7200,  badge: "Pro",      featured: false, tags: ["high", "pro"] },
    { id: "uc3850",  uc: 3850,  name: "Hardcore Pack", price: 12800, oldPrice: 14000, badge: "Save 9%",  featured: false, tags: ["high", "hardcore"] },
    { id: "uc8100",  uc: 8100,  name: "Legend Pack",   price: 26500, oldPrice: 29000, badge: "Legend",   featured: false, tags: ["mega", "legend"] }
  ],

  // ---------- Filter chips (label + matching price range) ----------
  filters: [
    { id: "all",    label: "All",         min: 0,     max: Infinity },
    { id: "small",  label: "Under 1,000", min: 0,     max: 999 },
    { id: "mid",    label: "1k – 5k",     min: 1000,  max: 4999 },
    { id: "large",  label: "5k – 15k",    min: 5000,  max: 14999 },
    { id: "mega",   label: "15k+",        min: 15000, max: Infinity }
  ]
};
