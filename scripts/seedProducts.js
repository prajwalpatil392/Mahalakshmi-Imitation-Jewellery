require('dotenv').config();
const db = require('../config/database');

const products = [
  // Both (Rent & Buy)
  {name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"📿",rentPerDay:150,buy:3200,type:"both",category:"Haram",baseStock:5},
  {name:"Bridal Maang Tikka",material:"Kundan & Meenakari",icon:"👑",rentPerDay:80,buy:1800,type:"both",category:"Maang Tikka",baseStock:5},
  {name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💛",rentPerDay:120,buy:2400,type:"both",category:"Necklace",baseStock:5},
  {name:"Jimikki Earrings",material:"South Indian Style",icon:"👂",rentPerDay:50,buy:950,type:"both",category:"Earrings",baseStock:5},
  {name:"Navaratna Necklace",material:"Stone-Studded",icon:"🔮",rentPerDay:180,buy:2800,type:"both",category:"Necklace",baseStock:4},
  {name:"Peacock Choker",material:"Antique Gold Plated",icon:"🦚",rentPerDay:140,buy:2600,type:"both",category:"Choker",baseStock:4},
  {name:"Ruby Pendant Set",material:"Gold Plated with Stones",icon:"💎",rentPerDay:100,buy:2200,type:"both",category:"Pendant",baseStock:6},
  {name:"Chandbali Earrings",material:"Traditional Design",icon:"🌙",rentPerDay:60,buy:1100,type:"both",category:"Earrings",baseStock:8},
  
  // Rent Only
  {name:"Full Bridal Set",material:"Antique Gold 12-Piece",icon:"🌸",rentPerDay:600,buy:null,type:"rent",category:"Bridal",baseStock:3},
  {name:"Royal Rani Haar",material:"Premium Temple Jewellery",icon:"👸",rentPerDay:400,buy:null,type:"rent",category:"Haar",baseStock:2},
  {name:"Maharani Necklace Set",material:"Heavy Bridal Collection",icon:"💫",rentPerDay:500,buy:null,type:"rent",category:"Necklace",baseStock:2},
  {name:"Grand Wedding Set",material:"Complete 15-Piece Set",icon:"✨",rentPerDay:800,buy:null,type:"rent",category:"Bridal",baseStock:2},
  {name:"Temple Jewellery Set",material:"Traditional South Indian",icon:"🕉️",rentPerDay:350,buy:null,type:"rent",category:"Temple",baseStock:3},
  
  // Buy Only
  {name:"Kangan Bangles (Set 4)",material:"Gold-Plated Brass",icon:"⭕",rentPerDay:null,buy:1200,type:"buy",category:"Bangles",baseStock:8},
  {name:"Antique Toe Ring Pair",material:"Sterling Silver Finish",icon:"🦶",rentPerDay:null,buy:450,type:"buy",category:"Anklets",baseStock:10},
  {name:"Gold Chain Necklace",material:"22K Gold Plated",icon:"⛓️",rentPerDay:null,buy:1800,type:"buy",category:"Chain",baseStock:6},
  {name:"Pearl Stud Earrings",material:"Freshwater Pearls",icon:"⚪",rentPerDay:null,buy:650,type:"buy",category:"Earrings",baseStock:12},
  {name:"Kada Bracelet Set",material:"Brass Gold Finish",icon:"💫",rentPerDay:null,buy:900,type:"buy",category:"Bracelet",baseStock:7},
  {name:"Nose Pin Collection",material:"Gold Plated (Set of 3)",icon:"💠",rentPerDay:null,buy:350,type:"buy",category:"Nose Pin",baseStock:15},
  {name:"Finger Ring Set",material:"Adjustable Gold Plated",icon:"💍",rentPerDay:null,buy:550,type:"buy",category:"Rings",baseStock:10},
  {name:"Payal Anklets",material:"Silver Finish with Bells",icon:"🔔",rentPerDay:null,buy:800,type:"buy",category:"Anklets",baseStock:8}
];

async function seedProducts() {
  try {
    const connection = await db.getConnection();
    console.log('Connected to database');
    
    await connection.query('DELETE FROM products');
    console.log('Cleared existing products');
    
    for (const product of products) {
      await connection.query(
        `INSERT INTO products (name, material, icon, rent_per_day, buy_price, type, category, base_stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [product.name, product.material, product.icon, product.rentPerDay, product.buy, product.type, product.category, product.baseStock]
      );
    }
    
    console.log('✅ Products seeded successfully');
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts();
