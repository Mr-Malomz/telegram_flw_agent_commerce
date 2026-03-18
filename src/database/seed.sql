INSERT INTO products (id, name, brand, description, price, inventory, category, notes, image_url) VALUES
  ('p1', 'Bleu Classic', 'Maison Bleu', 'A refreshing everyday scent with citrus top notes and a warm woody base. Perfect for daytime wear.', 25000.00, 100, 'fresh', 'citrus, woody', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400'),
  ('p2', 'Midnight Oud', 'Desert Essence', 'Rich and luxurious oud fragrance with deep amber undertones. A statement scent for evening occasions.', 45000.00, 50, 'luxury', 'oud, amber', 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400'),
  ('p3', 'Velvet Rose', 'Flora Atelier', 'Elegant rose perfume with a soft musk base. Romantic and timeless.', 22000.00, 80, 'floral', 'rose, musk', 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=400'),
  ('p4', 'Ocean Mist', 'Coastal Labs', 'Light and breezy sea-inspired fragrance with citrus accents. Great for casual everyday use.', 18000.00, 120, 'fresh', 'sea salt, citrus', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400'),
  ('p5', 'Noir Vanilla', 'Maison Noir', 'Warm and inviting vanilla perfume with subtle spice notes. Cozy and sophisticated.', 32000.00, 60, 'warm', 'vanilla, spice', 'https://images.unsplash.com/photo-1594035910387-fea081ccfcfa?w=400')
ON CONFLICT (id) DO NOTHING;
