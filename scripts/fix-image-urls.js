require('dotenv').config();
const db = require('../config/database');

async function fixImageUrls() {
  try {
    console.log('🔧 Fixing malformed image URLs in database...');
    
    // Get all products with image URLs
    const result = await db.query('SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL');
    const products = result.rows;
    
    console.log(`Found ${products.length} products with images`);
    
    let fixed = 0;
    let nullified = 0;
    
    for (const product of products) {
      let imageUrl = product.image_url;
      const originalUrl = imageUrl;
      
      // Fix double protocol
      imageUrl = imageUrl.replace(/https?:\/\/https?:\/\//gi, 'https://');
      
      // Fix domain concatenation (domain.comhttp:// or domain.comhttps://)
      imageUrl = imageUrl.replace(/(\.com|\.net|\.org)(https?:\/\/)/gi, '$1/');
      
      // Fix malformed protocol separator (http// or https//)
      imageUrl = imageUrl.replace(/https?\/\//gi, 'https://');
      
      // Force HTTPS
      imageUrl = imageUrl.replace(/^http:\/\//i, 'https://');
      
      // Validate URL
      let isValid = false;
      try {
        new URL(imageUrl);
        isValid = true;
      } catch (e) {
        console.warn(`  ⚠️  Invalid URL for "${product.name}": ${imageUrl}`);
        imageUrl = null;
        nullified++;
      }
      
      // Update if changed
      if (imageUrl !== originalUrl) {
        await db.query('UPDATE products SET image_url = $1 WHERE id = $2', [imageUrl, product.id]);
        
        if (imageUrl === null) {
          console.log(`  ❌ Nullified: "${product.name}" (was: ${originalUrl})`);
        } else {
          console.log(`  ✅ Fixed: "${product.name}"`);
          console.log(`     From: ${originalUrl}`);
          console.log(`     To:   ${imageUrl}`);
          fixed++;
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Fixed: ${fixed} URLs`);
    console.log(`  ❌ Nullified: ${nullified} URLs (invalid, will show icon)`);
    console.log(`  ⏭️  Unchanged: ${products.length - fixed - nullified} URLs`);
    console.log('\n✨ Done! Products with null image_url will display their icon emoji.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing image URLs:', error);
    process.exit(1);
  }
}

fixImageUrls();
