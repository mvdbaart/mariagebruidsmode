import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envFile = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const firstEqual = line.indexOf('=');
      if (firstEqual === -1) return null;
      const key = line.substring(0, firstEqual).trim();
      const value = line.substring(firstEqual + 1).trim();
      return [key, value];
    })
    .filter(Boolean)
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Real images from Unsplash that are guaranteed to work
const DRESS_IMAGES = [
  'https://images.unsplash.com/photo-1594552072238-b8a33785b6cd?w=800&q=80',
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80',
  'https://images.unsplash.com/photo-1583241479324-5be41d2e1e26?w=800&q=80',
  'https://images.unsplash.com/photo-1559571016-0d394741dce4?w=800&q=80',
  'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=800&q=80',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
  'https://images.unsplash.com/photo-1583985262977-3e8c9b16c6fe?w=800&q=80',
];

const SUIT_IMAGES = [
  'https://images.unsplash.com/photo-1594938298603-c8148e09c44e?w=800&q=80',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
];

const BLOG_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&q=80',
];

async function seed() {
  console.log('Starting seed process...');

  // 1. Upsert Collections
  const { data: collections, error: colError } = await supabase
    .from('collections')
    .upsert([
      { title: 'Etoile by Enzoani', type: 'dress', description: 'Elegante prints en tijdloze silhouetten van de befaamde Enzoani sub-lijn.', image_url: DRESS_IMAGES[0], slug: 'etoile-enzoani' },
      { title: 'Modeca', type: 'dress', description: 'Nederlandse elegantie met een romantische twist. Luxe stoffen en perfecte pasvorm.', image_url: DRESS_IMAGES[1], slug: 'modeca' },
      { title: 'Randy Fenoli', type: 'dress', description: 'Verfijnde glamour van de beroemde tv-designer. Volle rokken en koninklijke uitstraling.', image_url: DRESS_IMAGES[2], slug: 'randy-fenoli' },
      { title: 'Dama Couture', type: 'dress', description: 'Elegante haute couture voor de moderne bruid. Tijdloos, vrouwelijk en luxueus.', image_url: DRESS_IMAGES[3], slug: 'dama-couture' },
      { title: 'Demetrios', type: 'dress', description: 'Luxe en romantiek in elk detail. Wereldwijd bekend om hun buitengewone kwaliteit.', image_url: DRESS_IMAGES[4], slug: 'demetrios' },
      { title: 'Oksana Mukha', type: 'dress', description: 'Oekraïens ontwerphuis met een flair voor dramatische silhouetten en delicate details.', image_url: DRESS_IMAGES[5], slug: 'oksana-mukha' },
      { title: 'Roberto Vicentti', type: 'suit', description: 'Italiaanse stijl en vakmanschap voor de bruidegom. Elegante snit en duurzame stoffen.', image_url: SUIT_IMAGES[0], slug: 'roberto-vicentti' },
      { title: 'Immediate', type: 'suit', description: 'Hedendaagse pakken met oog voor elk detail. De favoriete keuze van de moderne bruidegom.', image_url: SUIT_IMAGES[1], slug: 'immediate' }
    ], { onConflict: 'slug' })
    .select();

  if (colError) { console.error('Error seeding collections:', colError); return; }
  console.log(`Collections seeded: ${collections.length}`);

  const cm = Object.fromEntries(collections.map(c => [c.slug, c.id]));

  // 2. Upsert Products
  const products = [
    { collection_id: cm['etoile-enzoani'], name: 'Etoile – Erin', slug: 'etoile-erin', brand: 'Etoile by Enzoani', price_range: '€ 2.195', description: 'Elegante strapless trouwjurk met verfijnde pareltjes langs de halslijn. Het gedrapeerde ontwerp richting de taille creëert een extra slanke en flatterende look.', images: [DRESS_IMAGES[0]], features: ['Strapless', 'Open rug', 'Glitter tule split'] },
    { collection_id: cm['modeca'], name: 'Modeca – Dusty', slug: 'modeca-dusty', brand: 'Modeca', price_range: '€ 1.895', description: 'Strakke mikado jurk met hooggesloten halterlijn en subtiele split. Perfecte snit voor een klassieke look met een moderne twist.', images: [DRESS_IMAGES[1]], features: ['Halterneck', 'Mikado', 'Split', 'Open rug'] },
    { collection_id: cm['modeca'], name: 'Modeca – Horacia', slug: 'modeca-horacia', brand: 'Modeca', price_range: '€ 1.795', description: 'Romantische jurk met een open rug en verfijnde details. Strak silhouet met zachte draping.', images: [DRESS_IMAGES[6]], features: ['Open rug', 'Romantisch', 'Strak'] },
    { collection_id: cm['randy-fenoli'], name: 'Randy Fenoli – Jacqueline Luxe', slug: 'randy-fenoli-jacqueline-luxe', brand: 'Randy Fenoli', price_range: '€ 3.295', description: 'Wijde prinsessen trouwjurk van luxe satijn/mikado. Het corsetlijfje met parels, sweetheart halslijn en elegante off-shoulder mouwen.', images: [DRESS_IMAGES[2]], features: ['Prinsessenstijl', 'Off-shoulder', 'Satijn', 'Parelenlijfje'] },
    { collection_id: cm['randy-fenoli'], name: 'Randy Fenoli – Goldie', slug: 'randy-fenoli-goldie', brand: 'Randy Fenoli', price_range: '€ 2.895', description: 'Glamouruze trouwjurk met schitterende goudkleurige details en volle rok.', images: [DRESS_IMAGES[5]], features: ['Glamour', 'Glitter', 'Volle rok'] },
    { collection_id: cm['dama-couture'], name: 'Dama – Venus', slug: 'dama-venus', brand: 'Dama Couture', price_range: '€ 1.695', description: 'Glamouruze korte trouwjurk, perfect als tweede trouwjurk of avondjurk. Combineer met een glitter bolero voor extra glamour.', images: [DRESS_IMAGES[3]], features: ['Kort model', 'Glamour', 'V-hals', 'Bolero mogelijk'] },
    { collection_id: cm['dama-couture'], name: 'Dama – Avalon', slug: 'dama-avalon', brand: 'Dama Couture', price_range: '€ 2.295', description: 'Tijdloze A-lijn trouwjurk met bohemian details en zachte tule rok.', images: [DRESS_IMAGES[7]], features: ['A-lijn', 'Bohemian', 'Tule'] },
    { collection_id: cm['demetrios'], name: 'Demetrios – 1507', slug: 'demetrios-1507', brand: 'Demetrios', price_range: '€ 2.595', description: 'Klassieke elegantie voor de tijdloze bruid. Verfijnd kant en een prachtige baljurk silhouet.', images: [DRESS_IMAGES[4]], features: ['Baljurk', 'Kant', 'Klassiek'] },
    { collection_id: cm['oksana-mukha'], name: 'Oksana Mukha – Willow', slug: 'oksana-mukha-willow', brand: 'Oksana Mukha', price_range: '€ 2.795', description: 'Dramatisch zeemeermin silhouet met delicate bloemdetails. Perfect voor de bruid die wil opvallen.', images: [DRESS_IMAGES[5]], features: ['Mermaid', 'Bloemmotieven', 'Lange sleep'] },
    { collection_id: cm['roberto-vicentti'], name: 'Roberto Vicentti – Jade', slug: 'roberto-vicentti-jade', brand: 'Roberto Vicentti', price_range: '€ 795', description: 'Stijlvol groen 3-delig trouwpak met verfijnde Italiaanse snit en premium stoffen.', images: [SUIT_IMAGES[0]], features: ['3-delig', 'Slim fit', 'Italiaans'] },
    { collection_id: cm['roberto-vicentti'], name: 'Roberto Vicentti – Cobalt', slug: 'roberto-vicentti-cobalt', brand: 'Roberto Vicentti', price_range: '€ 895', description: 'Klassiek marineblauw pak met een moderne twist. De ideale keuze voor de elegante bruidegom.', images: [SUIT_IMAGES[1]], features: ['Marineblauw', 'Modern fit', '2-delig'] },
    { collection_id: cm['immediate'], name: 'Immediate – Slate', slug: 'immediate-slate', brand: 'Immediate', price_range: '€ 695', description: 'Modern grijsgroen pak met strakke lijnen. Hedendaags design voor de trendy bruidegom.', images: [SUIT_IMAGES[2]], features: ['Grijs-groen', 'Slim fit', 'Modern'] }
  ];

  const { error: prodError } = await supabase.from('products').upsert(products, { onConflict: 'slug' });
  if (prodError) console.error('Error seeding products:', prodError);
  else console.log(`Products seeded: ${products.length}`);

  // 3. Upsert Real Weddings
  const weddings = [
    { bride_name: 'Lisan', groom_name: 'Detmar', slug: 'lisan-detmar', story: 'Sprookjeshuwelijk in de Dolomieten in Italië. Een droom die uitkomt voor dit prachtige bruidspaar, wat een fantastische beelden!', cover_image: BLOG_IMAGES[0], gallery_images: [BLOG_IMAGES[1], BLOG_IMAGES[2]], wedding_date: '2024-06-15' },
    { bride_name: 'Emma', groom_name: 'Lars', slug: 'emma-lars', story: 'Romantisch huwelijk op een landgoed in de Achterhoek. Emma koos voor een prachtige Randy Fenoli jurk en Lars droeg een op maat gemaakt Roberto Vicentti pak.', cover_image: BLOG_IMAGES[1], gallery_images: [BLOG_IMAGES[0]], wedding_date: '2024-09-07' }
  ];

  const { error: rwError } = await supabase.from('real_weddings').upsert(weddings, { onConflict: 'slug' });
  if (rwError) console.error('Error seeding real weddings:', rwError);
  else console.log(`Real weddings seeded: ${weddings.length}`);

  // 4. Upsert Blog Posts
  const posts = [
    { title: 'Budgetvriendelijke bruidsmode: Hoe stijlvol blijven zonder te veel uit te geven', slug: 'budgetvriendelijke-bruidsmode', content: 'Voordat je op zoek gaat naar een trouwjurk of trouwpak, is het belangrijk om inzicht te hebben in je totale budget. Bij Mariage Bruidsmode hebben we trouwjurken van uitlopende prijscategorieën. Zo is de goedkoopste trouwjurk in de outlet € 495,- maar onze duurste trouwjurk kan oplopen tot € 6.000,-.\n\nTips voor een budgetvriendelijke bruiloft:\n\n1. Stel een duidelijk budget in\n2. Kijk ook in onze outlet\n3. Overweeg een sample sale\n4. Kies voor tijdloze stijlen die hergebruikt kunnen worden\n\nOnze stylisten helpen je graag de perfecte jurk te vinden die bij je budget past!', excerpt: 'Ontdek handige tips voor budgetvriendelijke bruidsmode en hoe je stijlvol blijft zonder je budget te overschrijden.', author: 'Mariage Team', cover_image: BLOG_IMAGES[0], published_at: '2024-02-15T12:00:00Z', tags: ['tips', 'budget', 'bruidsmode'] },
    { title: 'Lente Trouwjurkenactie — Ontvang een cheque t.w.v. €150', slug: 'lente-trouwjurkenactie', content: 'De lente staat voor de deur en bij Mariage Bruidsmode vieren we dat met een bijzondere actie! Tijdens de afspraak maken we er een belevenis van, zodat jij optimaal kan genieten van deze ervaring. Bride-stembordjes, prosecco en meer!\n\nProfiteer nu van onze lente actie met een cheque t.w.v. 150 euro bij aankoop van jouw droomjurk.\n\nDe actie is geldig tot 1 juni 2024. Maak snel een afspraak!', excerpt: 'Vier de lente bij Mariage! Ontvang een cheque t.w.v. €150 bij aankoop van je droomjurk.', author: 'Mariage Team', cover_image: BLOG_IMAGES[1], published_at: '2024-03-01T10:00:00Z', tags: ['actie', 'lente', 'aanbieding'] },
    { title: 'Bruidegom trends 2024 — Welk pak past bij jou?', slug: 'bruidegom-trends-2024', content: 'Het trouwpak is minstens zo belangrijk als de trouwjurk! In 2024 zien we prachtige trends voorbijkomen. Van klassiek marineblauw tot diepe groentinten — er is voor elke bruidegom een perfecte stijl.\n\nDe grootste trends dit jaar:\n\n1. Aardetinten — van salie groen tot terracotta\n2. Velvet jackets voor een luxueuze uitstraling\n3. Klassiek zwart met een moderne twist\n4. Gewaagde kleurcombinaties\n\nBezoek onze winkel voor een gratis adviesgesprek met onze pakspecialisten!', excerpt: 'Ontdek de mooiste trouwpak trends van 2024 en vind de perfecte stijl voor de bruidegom.', author: 'Mariage Team', cover_image: BLOG_IMAGES[2], published_at: '2024-01-10T09:00:00Z', tags: ['trouwpak', 'bruidegom', 'trends'] }
  ];

  const { error: blogError } = await supabase.from('blog_posts').upsert(posts, { onConflict: 'slug' });
  if (blogError) console.error('Error seeding blog posts:', blogError);
  else console.log(`Blog posts seeded: ${posts.length}`);

  console.log('\n✅ Seed process finished!');
}

seed();
