const sampleData = [
  {
    "name": "Gold Necklace Set",
    "material": "22K Gold",
    "icon": "💎",
    "rent_per_day": 500,
    "buy_price": 85000,
    "type": "both",
    "category": "Necklace",
    "base_stock": 5,
    "available": true,
    "description": "Elegant 22K gold necklace set with intricate design, perfect for weddings and special occasions"
  },
  {
    "name": "Diamond Earrings",
    "material": "Diamond & Gold",
    "icon": "💍",
    "rent_per_day": 300,
    "buy_price": 45000,
    "type": "both",
    "category": "Earrings",
    "base_stock": 8,
    "available": true,
    "description": "Stunning diamond earrings set in gold, adds sparkle to any outfit"
  },
  {
    "name": "Temple Jewellery Set",
    "material": "Gold Plated",
    "icon": "🪔",
    "rent_per_day": 400,
    "buy_price": 35000,
    "type": "both",
    "category": "Bridal Set",
    "base_stock": 4,
    "available": true,
    "description": "Traditional temple jewellery set with goddess motifs, ideal for South Indian weddings"
  },
  {
    "name": "Pearl Necklace",
    "material": "Pearls & Silver",
    "icon": "📿",
    "rent_per_day": 250,
    "buy_price": 28000,
    "type": "both",
    "category": "Necklace",
    "base_stock": 6,
    "available": true,
    "description": "Classic pearl necklace with silver clasp, timeless elegance"
  },
  {
    "name": "Kundan Maang Tikka",
    "material": "Kundan & Gold",
    "icon": "👑",
    "rent_per_day": 200,
    "buy_price": 18000,
    "type": "both",
    "category": "Maang Tikka",
    "base_stock": 7,
    "available": true,
    "description": "Beautiful kundan maang tikka with intricate work, perfect for brides"
  },
  {
    "name": "Antique Bangles Set",
    "material": "Antique Gold",
    "icon": "⭕",
    "rent_per_day": 350,
    "buy_price": 42000,
    "type": "both",
    "category": "Bangles",
    "base_stock": 10,
    "available": true,
    "description": "Set of 6 antique gold bangles with traditional designs"
  },
  {
    "name": "Ruby Pendant Set",
    "material": "Ruby & Gold",
    "icon": "❤️",
    "rent_per_day": 450,
    "buy_price": 65000,
    "type": "both",
    "category": "Pendant",
    "base_stock": 5,
    "available": true,
    "description": "Exquisite ruby pendant with matching earrings in gold setting"
  },
  {
    "name": "Emerald Choker",
    "material": "Emerald & Gold",
    "icon": "💚",
    "rent_per_day": 600,
    "buy_price": 95000,
    "type": "both",
    "category": "Choker",
    "base_stock": 3,
    "available": true,
    "description": "Luxurious emerald choker necklace, statement piece for grand occasions"
  },
  {
    "name": "Silver Anklets",
    "material": "Pure Silver",
    "icon": "🔗",
    "rent_per_day": 150,
    "buy_price": 12000,
    "type": "both",
    "category": "Anklets",
    "base_stock": 12,
    "available": true,
    "description": "Traditional silver anklets with ghungroo bells"
  },
  {
    "name": "Polki Jhumkas",
    "material": "Polki & Gold",
    "icon": "🌟",
    "rent_per_day": 280,
    "buy_price": 32000,
    "type": "both",
    "category": "Earrings",
    "base_stock": 8,
    "available": true,
    "description": "Traditional polki jhumka earrings with pearl drops"
  },
  {
    "name": "Bridal Necklace Set",
    "material": "22K Gold & Stones",
    "icon": "👰",
    "rent_per_day": 800,
    "buy_price": 125000,
    "type": "both",
    "category": "Bridal Set",
    "base_stock": 2,
    "available": true,
    "description": "Complete bridal jewellery set including necklace, earrings, maang tikka, and bangles"
  },
  {
    "name": "Gold Chain",
    "material": "22K Gold",
    "icon": "⛓️",
    "rent_per_day": 200,
    "buy_price": 55000,
    "type": "both",
    "category": "Chain",
    "base_stock": 6,
    "available": true,
    "description": "Classic gold chain, versatile for daily wear or special occasions"
  },
  {
    "name": "Navratna Ring",
    "material": "Nine Gems & Gold",
    "icon": "💫",
    "rent_per_day": 180,
    "buy_price": 25000,
    "type": "both",
    "category": "Ring",
    "base_stock": 10,
    "available": true,
    "description": "Traditional navratna ring with nine auspicious gemstones"
  },
  {
    "name": "Lakshmi Coin Necklace",
    "material": "Gold",
    "icon": "🪙",
    "rent_per_day": 400,
    "buy_price": 68000,
    "type": "both",
    "category": "Necklace",
    "base_stock": 4,
    "available": true,
    "description": "Gold necklace with Lakshmi coin pendants, symbol of prosperity"
  },
  {
    "name": "Meenakari Bangles",
    "material": "Enamel & Gold",
    "icon": "🎨",
    "rent_per_day": 320,
    "buy_price": 38000,
    "type": "both",
    "category": "Bangles",
    "base_stock": 8,
    "available": true,
    "description": "Colorful meenakari work bangles with traditional patterns"
  },
  {
    "name": "Sapphire Pendant",
    "material": "Sapphire & White Gold",
    "icon": "💙",
    "rent_per_day": 380,
    "buy_price": 52000,
    "type": "both",
    "category": "Pendant",
    "base_stock": 5,
    "available": true,
    "description": "Elegant blue sapphire pendant in white gold setting"
  },
  {
    "name": "Nose Ring Collection",
    "material": "Gold & Stones",
    "icon": "✨",
    "rent_per_day": 100,
    "buy_price": 8000,
    "type": "both",
    "category": "Nose Ring",
    "base_stock": 15,
    "available": true,
    "description": "Assorted nose rings in various designs with stones"
  },
  {
    "name": "Waist Belt (Vaddanam)",
    "material": "Gold Plated",
    "icon": "🎀",
    "rent_per_day": 450,
    "buy_price": 48000,
    "type": "both",
    "category": "Waist Belt",
    "base_stock": 3,
    "available": true,
    "description": "Traditional South Indian waist belt with intricate design"
  },
  {
    "name": "Chandbali Earrings",
    "material": "Gold & Pearls",
    "icon": "🌙",
    "rent_per_day": 260,
    "buy_price": 29000,
    "type": "both",
    "category": "Earrings",
    "base_stock": 7,
    "available": true,
    "description": "Crescent-shaped chandbali earrings with pearl drops"
  },
  {
    "name": "Haram Long Necklace",
    "material": "22K Gold",
    "icon": "📿",
    "rent_per_day": 550,
    "buy_price": 92000,
    "type": "both",
    "category": "Necklace",
    "base_stock": 3,
    "available": true,
    "description": "Long traditional haram necklace with temple motifs"
  }
];

function loadSampleData() {
  document.getElementById('jsonInput').value = JSON.stringify(sampleData, null, 2);
  showToast('✓ Sample data loaded!');
  validateJSON();
}

function validateJSON() {
  const input = document.getElementById('jsonInput').value.trim();

  if (!input) {
    showToast('⚠️ Please enter JSON data', 'error');
    return;
  }

  try {
    const data = JSON.parse(input);

    if (!Array.isArray(data)) {
      showToast('⚠️ JSON must be an array of products', 'error');
      return;
    }

    // Calculate stats
    const stats = {
      total: data.length,
      rent: data.filter(p => p.type === 'rent').length,
      buy: data.filter(p => p.type === 'buy').length,
      both: data.filter(p => p.type === 'both').length
    };

    document.getElementById('productCount').textContent = stats.total;
    document.getElementById('rentCount').textContent = stats.rent;
    document.getElementById('buyCount').textContent = stats.buy;
    document.getElementById('bothCount').textContent = stats.both;
    document.getElementById('stats').style.display = 'grid';

    showToast(`✓ Valid JSON! ${stats.total} products ready to import`);
  } catch (error) {
    showToast('❌ Invalid JSON: ' + error.message, 'error');
    document.getElementById('stats').style.display = 'none';
  }
}

function copyToClipboard() {
  const input = document.getElementById('jsonInput');
  const text = input.value.trim();

  if (!text) {
    showToast('⚠️ Nothing to copy', 'error');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Copied to clipboard!');
  }).catch(() => {
    // Fallback
    input.select();
    document.execCommand('copy');
    showToast('✓ Copied to clipboard!');
  });
}

function clearData() {
  document.getElementById('jsonInput').value = '';
  document.getElementById('stats').style.display = 'none';
  showToast('Cleared');
}

function downloadJSON() {
  const input = document.getElementById('jsonInput').value.trim();

  if (!input) {
    showToast('⚠️ Nothing to download', 'error');
    return;
  }

  try {
    JSON.parse(input); // Validate
    const blob = new Blob([input], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ Downloaded products.json');
  } catch (error) {
    showToast('❌ Invalid JSON, cannot download', 'error');
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#8B1A1A' : 'var(--gold)';
  toast.style.color = type === 'error' ? '#fff' : 'var(--maroon-deep)';
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Load sample data on page load
window.onload = () => {
  loadSampleData();
};
