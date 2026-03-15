-- Clear existing seed data if needed (optional)
-- TRUNCATE collections, products, real_weddings, blog_posts CASCADE;

-- Add real collections
INSERT INTO collections (title, type, description, image_url, slug) VALUES
('Enzoani', 'dress', 'Exclusieve en innovatieve designs voor de moderne bruid.', 'https://www.enzoani.com/images/default-source/collections/blue-by-enzoani/2024/bt24-01/main-front.jpg', 'enzoani'),
('Modeca', 'dress', 'Nederlandse elegantie met een romantische twist.', 'https://www.modeca.com/images/collections/modeca-collection/2024/astrid/astrid-front.jpg', 'modeca'),
('Roberto Vicentti', 'suit', 'Italiaanse stijl en vakmanschap voor de bruidegom.', 'https://www.robertovicentti.com/wp-content/uploads/2023/10/RV_SS24_01.jpg', 'roberto-vicentti'),
('Immediate', 'suit', 'Hedendaagse pakken met oog voor elk detail.', 'https://immediate-fashion.nl/wp-content/uploads/2023/11/IM_24_01.jpg', 'immediate');

-- Add real products
INSERT INTO products (collection_id, name, slug, brand, description, images, features) VALUES
((SELECT id FROM collections WHERE slug = 'modeca'), 'Modeca Dusty', 'modeca-dusty', 'Modeca', 'Een prachtige A-lijn trouwjurk met verfijnd kant.', ARRAY['https://www.mariagebruidsmode.nl/wp-content/uploads/2024/01/modeca-trouwjurk-dusty-front.jpg'], ARRAY['A-lijn', 'V-hals', 'Kant']),
((SELECT id FROM collections WHERE slug = 'enzoani'), 'Enzoani Petal', 'enzoani-petal', 'Enzoani', 'Prachtige zeemeermin jurk met kanten details.', ARRAY['https://www.mariagebruidsmode.nl/wp-content/uploads/2023/10/enzoani-petal-front.jpg'], ARRAY['Mermaid', 'Open rug', 'Kant']),
((SELECT id FROM collections WHERE slug = 'roberto-vicentti'), 'COR.44.26.800', 'roberto-vicentti-cor-44-26-800', 'Roberto Vicentti', 'Middengroen trouwpak met verfijnde details.', ARRAY['https://www.mariagebruidsmode.nl/wp-content/uploads/2023/12/roberto-vicentti-cor-44-26-800.jpg'], ARRAY['Groen', '3-delig', 'Modern fit']);

-- Real Weddings
INSERT INTO real_weddings (bride_name, groom_name, slug, story, cover_image, gallery_images, wedding_date) VALUES
('Lisan', 'Detmar', 'lisan-detmar', 'Sprookjeshuwelijk in de Dolomieten in Italie. Een droom die uitkomt voor dit prachtige bruidspaar, wat een fantastische beelden!', 'https://www.mariagebruidsmode.nl/wp-content/uploads/2024/03/real-wedding-lisan-detmar-hero.jpg', ARRAY['https://www.mariagebruidsmode.nl/wp-content/uploads/2024/03/real-wedding-lisan-detmar-1.jpg', 'https://www.mariagebruidsmode.nl/wp-content/uploads/2024/03/real-wedding-lisan-detmar-2.jpg'], '2024-03-12');

-- Blog Posts
INSERT INTO blog_posts (title, slug, content, excerpt, author, cover_image, published_at) VALUES
('Budgetvriendelijke bruidsmode: Hoe stijlvol blijven zonder te veel uit te geven', 'budgetvriendelijke-bruidsmode', 'Voordat je op zoek gaat naar een trouwjurk of trouwpak, is het belangrijk om inzicht te hebben in je totale budget. Bij Mariage Bruidsmode hebben we namelijk trouwjurken van uitlopende prijscategorieën. Zo is de goedkoopste trouwjurk in de outlet € 495,- maar onze duurste trouwjurk is bijvoorbeeld € 6000,-.', 'Ontdek handige tips voor budgetvriendelijke bruidsmode en hoe je stijlvol blijft zonder je budget te overschrijden.', 'Mariage Team', 'https://www.mariagebruidsmode.nl/wp-content/uploads/2024/02/budget-bruidsmode-blog.jpg', '2024-02-15'),
('Lente Trouwjurkenactie', 'lente-trouwjurkenactie', 'Tijdens de afspraak maken we er een belevenis van, zodat jij optimaal kan genieten van deze ervaring. Bride-stembordjes, prosecco en meer! Profiteer nu van onze lente actie met een cheque t.w.v. 150 euro.', 'Vier de lente bij Mariage! Ontvang een cheque t.w.v. 150 euro bij aankoop van je droomjurk.', 'Mariage Team', 'https://www.mariagebruidsmode.nl/wp-content/uploads/2024/03/lente-actie-blog.jpg', '2024-03-01');
