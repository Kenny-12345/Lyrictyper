/**
 * lyricsService.js
 * Synced lyrics parser using the free, open-source LRCLIB API.
 */

export async function getSyncedLyrics(artist, title) {
  const cleanTitle = title.replace(/\(feat\..*?\)/gi, '').replace(/ft\..*?/gi, '').trim();
  const cleanArtist = artist.split('&')[0].split(',')[0].trim();

  // Try fetching direct match from LRCLIB
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data.syncedLyrics) {
        return parseLRC(data.syncedLyrics);
      }
    }
  } catch (err) {
    console.warn("LrcLib direct fetch failed, trying search fallback...", err);
  }

  // Try search match if direct fetch wasn't successful
  try {
    const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const response = await fetch(searchUrl);
    if (response.ok) {
      const results = await response.json();
      const bestMatch = results.find(r => r.syncedLyrics);
      if (bestMatch) {
        return parseLRC(bestMatch.syncedLyrics);
      }
    }
  } catch (err) {
    console.error("LrcLib search failed:", err);
  }

  return getFallbackLyrics(artist, title);
}

function parseLRC(lrcText) {
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;

  for (const line of lines) {
    // Check if line contains timestamp
    const matches = line.match(timeRegex);
    if (!matches) continue;
    
    // Clean text by stripping timestamps
    const text = line.replace(timeRegex, '').trim();
    
    // Some lines are purely instrumental cues like [music] or empty lines
    if (!text || text.match(/^\[.*\]$/)) continue;

    // For lines with multiple timestamps (e.g. [00:12.34][01:05.12] Repeat Lyric)
    for (const match of matches) {
      const timeMatch = /\[(\d+):(\d+)(?:\.(\d+))?\]/.exec(match);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        const msString = timeMatch[3] || '0';
        const milliseconds = parseInt(msString.padEnd(3, '0').slice(0, 3), 10);
        const timeInSec = minutes * 60 + seconds + milliseconds / 1000;
        
        parsed.push({
          time: timeInSec,
          text: text
        });
      }
    }
  }

  // Sort chronologically
  return parsed.sort((a, b) => a.time - b.time);
}

function getFallbackLyrics(artist, title) {
  // Generate timed fallback lyrics so the typing game is always playable
  const fallbackWords = [
    "This is a fallback typing track",
    "Because we couldn't find the synced lyrics",
    "For this specific song on the online server",
    "Don't worry, you can still type to the rhythm",
    "Of the music playing in the background",
    "Just keep your fingers on the keyboard",
    "Keep typing these lines as they appear",
    "WPM and accuracy will still be counted",
    "Music makes typing way more fun",
    "Focus on your speed and rhythm",
    "Wavify typing game challenge mode",
    "Almost at the end of the fallback lyrics",
    "Thank you for playing and practicing WPM"
  ];

  // Distribute lines every 6 seconds starting from 3s
  return fallbackWords.map((text, index) => ({
    time: 3 + index * 6.5,
    text
  }));
}
