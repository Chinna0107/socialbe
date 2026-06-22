const pool = require('../db');

async function seed() {
  try {
    console.log('🌱 Starting database seeding for campaigns, donations, products, and orders...');

    // 1. Insert/Update Campaigns
    const c1_id = 'CAMP-DOLPHINS';
    const c2_id = 'CAMP-ENERGY';

    // Delete existing to avoid conflicts
    await pool.query('DELETE FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE campaign_id IN ($1, $2))', [c1_id, c2_id]);
    await pool.query('DELETE FROM tasks WHERE campaign_id IN ($1, $2)', [c1_id, c2_id]);
    await pool.query('DELETE FROM donations WHERE campaign_id IN ($1, $2)', [c1_id, c2_id]);
    await pool.query('DELETE FROM campaign_registrations WHERE campaign_id IN ($1, $2)', [c1_id, c2_id]);
    await pool.query('DELETE FROM campaigns WHERE id IN ($1, $2)', [c1_id, c2_id]);

    await pool.query(`
      INSERT INTO campaigns (id, title, description, image, goal, collected, tag, status)
      VALUES 
      ($1, 'Save the Dolphins Initiative', 'Protecting dolphin habitats and coastal biodiversity in marine sanctuaries.', 'https://images.unsplash.com/photo-1570481662006-a3a13746fe4e?w=800', 200000, 85000, 'environment', 'active'),
      ($2, 'Clean Solar Energy for Schools', 'Equipping rural school campuses with clean, self-sustaining solar panels.', 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800', 500000, 120000, 'education', 'active')
    `, [c1_id, c2_id]);
    console.log('c1:', c1_id, 'c2:', c2_id);
    console.log('✅ Campaigns seeded successfully.');

    // 2. Insert Donations (one by one to avoid param bind errors)
    const donationsData = [
      {
        id: 'DON-' + Math.random().toString(36).toUpperCase().slice(2, 10),
        campaign_id: c2_id,
        amount: 15000,
        name: 'Ramesh Kumar',
        email: 'ramesh@example.com',
        msg: '[Phone: 9876543210] [Address: 123 Green Ave, Saket, New Delhi - 110017]'
      },
      {
        id: 'DON-' + Math.random().toString(36).toUpperCase().slice(2, 10),
        campaign_id: c1_id,
        amount: 20000,
        name: 'Priya Sharma',
        email: 'priya@example.com',
        msg: '[Phone: 9123456789] [Address: Flat 405, Sector 15, Noida, Uttar Pradesh - 201301]'
      },
      {
        id: 'DON-' + Math.random().toString(36).toUpperCase().slice(2, 10),
        campaign_id: c1_id,
        amount: 50000,
        name: 'John Doe',
        email: 'john@example.com',
        msg: '[Phone: 9811223344] [Address: Building 2, Bandra West, Mumbai, Maharashtra - 400050]'
      },
      {
        id: 'DON-' + Math.random().toString(36).toUpperCase().slice(2, 10),
        campaign_id: c2_id,
        amount: 100000,
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        msg: '[Phone: 9555667788] [Address: House 12, Gachibowli, Hyderabad, Telangana - 500032]'
      }
    ];

    for (const d of donationsData) {
      await pool.query(`
        INSERT INTO donations (id, user_id, campaign_id, amount, donor_name, donor_email, message, status)
        VALUES ($1, null, $2, $3, $4, $5, $6, 'completed')
      `, [d.id, d.campaign_id, d.amount, d.name, d.email, d.msg]);
    }
    console.log('✅ Donations seeded successfully.');

    // 3. Insert Products
    const p1_id = 'PROD-MUG';
    const p2_id = 'PROD-NOTEBOOK';
    const p3_id = 'PROD-TSHIRT';

    await pool.query('DELETE FROM products WHERE id IN ($1, $2, $3)', [p1_id, p2_id, p3_id]);
    await pool.query(`
      INSERT INTO products (id, name, description, price, image, stock, category, status)
      VALUES
      ($1, 'Eco Friendly Bamboo Mug', 'Reusable high-grade bamboo mug perfect for hot coffee and tea.', 250, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800', 100, 'Accessories', 'active'),
      ($2, 'Recycled Cardboard Notebook', '120 pages of high quality recycled kraft paper notebook for daily journaling.', 180, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800', 150, 'Stationery', 'active'),
      ($3, 'Organic Cotton T-Shirt', '100% certified organic ring-spun cotton tee in carbon-neutral green color.', 650, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', 75, 'Apparel', 'active')
    `, [p1_id, p2_id, p3_id]);
    console.log('✅ Products seeded successfully.');

    // 4. Insert Orders (one by one)
    const o1_id = 'ORD-' + Math.random().toString(36).toUpperCase().slice(2, 10);
    const o2_id = 'ORD-' + Math.random().toString(36).toUpperCase().slice(2, 10);
    const o3_id = 'ORD-' + Math.random().toString(36).toUpperCase().slice(2, 10);

    const items1 = JSON.stringify([{ _id: p1_id, name: 'Eco Friendly Bamboo Mug', price: 250, qty: 1 }]);
    const items2 = JSON.stringify([{ _id: p2_id, name: 'Recycled Cardboard Notebook', price: 180, qty: 2 }]);
    const items3 = JSON.stringify([
      { _id: p3_id, name: 'Organic Cotton T-Shirt', price: 650, qty: 1 },
      { _id: p1_id, name: 'Eco Friendly Bamboo Mug', price: 250, qty: 1 }
    ]);

    await pool.query('DELETE FROM orders WHERE id IN ($1, $2, $3)', [o1_id, o2_id, o3_id]);
    
    await pool.query(`
      INSERT INTO orders (id, user_id, items, total, address, status)
      VALUES ($1, null, $2, 250, 'Ramesh Kumar | Saket, Delhi', 'completed')
    `, [o1_id, items1]);

    await pool.query(`
      INSERT INTO orders (id, user_id, items, total, address, status)
      VALUES ($1, null, $2, 360, 'Priya Sharma | Sector 15, Noida', 'completed')
    `, [o2_id, items2]);

    await pool.query(`
      INSERT INTO orders (id, user_id, items, total, address, status)
      VALUES ($1, null, $2, 900, 'John Doe | Bandra West, Mumbai', 'pending')
    `, [o3_id, items3]);

    console.log('✅ Orders seeded successfully.');
    console.log('🎉 Seeding complete!');
  } catch (err) {
    console.error('❌ Error seeding data:', err);
  } finally {
    await pool.end();
  }
}

seed();
