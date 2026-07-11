export default async function handler(req, res) {
  const { term, media, entity, limit } = req.query;

  if (!term) {
    return res.status(400).json({ error: 'Missing term parameter' });
  }

  try {
    const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=${media || 'music'}&entity=${entity || 'song'}&limit=${limit || 30}`;
    
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    console.error('iTunes Proxy API error:', error);
    res.status(500).json({ error: error.message });
  }
}
