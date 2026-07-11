export default async function handler(req, res) {
  const { limit, country, genre } = req.query;

  try {
    const c = country || 'us';
    let targetUrl = `https://itunes.apple.com/${c}/rss/topsongs/limit=${limit || 30}`;
    if (genre) {
      targetUrl += `/genre=${genre}`;
    }
    targetUrl += '/json';
    
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    console.error('iTunes Charts API error:', error);
    res.status(500).json({ error: error.message });
  }
}
