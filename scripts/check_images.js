// Using global fetch

const images = [
  'https://www.mariagebruidsmode.nl/wp-content/uploads/2024/01/modeca-trouwjurk-dusty-front.jpg',
  'https://www.mariagebruidsmode.nl/wp-content/uploads/2023/10/enzoani-petal-front.jpg',
  'https://www.mariagebruidsmode.nl/wp-content/uploads/2023/12/roberto-vicentti-cor-44-26-800.jpg'
];

async function check() {
  for (const url of images) {
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      console.log(`${url}: ${resp.status} ${resp.statusText}`);
    } catch (e) {
      console.error(`${url}: ERROR ${e.message}`);
    }
  }
}

check();
