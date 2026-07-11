/**
 * youtubeService.js
 * iTunes Search & Top Charts API integration with YouTube video resolver.
 */

export async function getTopCharts(limit = 10, country = 'us') {
  try {
    const response = await fetch(`/api/itunes-charts?limit=${limit}&country=${country}`);
    const data = await response.json();
    const entries = data?.feed?.entry || [];
    
    return entries.map((entry, index) => {
      const trackId = entry.id?.attributes?.['im:id'] || `chart_${index}`;
      const title = entry['im:name']?.label || 'Unknown Title';
      const artist = entry['im:artist']?.label || 'Unknown Artist';
      const album = entry['im:collection']?.['im:name']?.label || 'Single';
      const songGenre = entry['category']?.attributes?.label || 'Pop';
      const releaseDate = entry['im:releaseDate']?.label;
      const year = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear();
      
      const rawImg = entry['im:image']?.[2]?.label || '';
      const artwork = rawImg.replace(/\/\d+x\d+bb/g, '/400x400bb');

      return {
        id: `itunes_${trackId}`,
        title,
        artist,
        album,
        genre: songGenre,
        year,
        thumbnail: artwork || 'https://via.placeholder.com/400?text=♪',
        videoId: null,
      };
    });
  } catch (error) {
    console.error('Failed to fetch top charts:', error);
    return [];
  }
}

export async function searchMusic(query) {
  if (!query || query.trim().length === 0) return [];

  try {
    const response = await fetch(`/api/itunes?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`);
    const data = await response.json();
    const results = data.results || [];
    
    return results.map(track => {
      const artwork = track.artworkUrl100
        ? track.artworkUrl100.replace('100x100bb', '400x400bb')
        : 'https://via.placeholder.com/400?text=♪';

      return {
        id: `itunes_${track.trackId}`,
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName || 'Single',
        genre: track.primaryGenreName || 'Pop',
        year: new Date(track.releaseDate).getFullYear(),
        thumbnail: artwork,
        videoId: null, 
      };
    });
  } catch (error) {
    console.error('iTunes Search API failed:', error);
    return [];
  }
}

export async function resolveVideoId(song) {
  if (song.videoId) return song.videoId;

  const query = `${song.artist} - ${song.title} (Official Audio)`;
  
  try {
    const response = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    if (data && data.videoId) {
      return data.videoId;
    }
  } catch (e) {
    console.error('Failed to resolve YouTube ID:', e.message);
  }
  return null;
}
