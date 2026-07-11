import { useState, useEffect } from 'react';
import './App.css';
import { Volume2, Music, TrendingUp, Play, Pause, RefreshCw } from 'lucide-react';
import { getTopCharts, searchMusic, resolveVideoId } from './services/youtubeService';
import { getSyncedLyrics } from './services/lyricsService';
import YoutubePlayer from './components/YoutubePlayer';
import TypingGame from './components/TypingGame';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [topCharts, setTopCharts] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState([]);
  const [resolvedVideoId, setResolvedVideoId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function loadCharts() {
      const charts = await getTopCharts(10);
      setTopCharts(charts);
      if (charts.length > 0) selectSong(charts[0]);
    }
    loadCharts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchMusic(searchQuery);
      setSearchResults(results);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectSong = async (song) => {
    setIsLoading(true);
    setSelectedSong(song);
    setIsPlaying(false);
    setCurrentTime(0);
    setResolvedVideoId(null);
    setLyrics([]);
    setShowDropdown(false);
    setSearchQuery('');
    try {
      const [videoId, syncedLyrics] = await Promise.all([
        resolveVideoId(song),
        getSyncedLyrics(song.artist, song.title)
      ]);
      setResolvedVideoId(videoId);
      setLyrics(syncedLyrics);
    } catch (err) {
      console.error('Error loading song:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 200);
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">L</div>
          <h1>LyricTyper</h1>
        </div>
        <div className="search-container" style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search songs or artists..."
            className="search-input"
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults.map(song => (
                <div key={song.id} className="search-result-item" onClick={() => selectSong(song)}>
                  <img src={song.thumbnail} alt="" className="search-result-thumb" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '6px', objectFit: 'cover' }} />
                  <div className="search-result-info">
                    <div className="search-result-title">{song.title}</div>
                    <div className="search-result-artist">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-grid">
        {/* Left sidebar */}
        <section className="song-sidebar">
          {selectedSong && (
            <div className="song-card">
              {resolvedVideoId ? (
                <YoutubePlayer
                  videoId={resolvedVideoId}
                  isPlaying={isPlaying}
                  volume={volume}
                  onTimeUpdate={setCurrentTime}
                  onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
                />
              ) : (
                <div className="video-player-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '0.85rem' }}>
                  {isLoading ? 'Loading...' : 'No video loaded'}
                </div>
              )}
              <div className="song-meta-info">
                <img src={selectedSong.thumbnail} alt="" className="song-meta-thumb" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '8px', objectFit: 'cover' }} />
                <div className="song-details">
                  <div className="song-title">{selectedSong.title}</div>
                  <div className="song-artist">{selectedSong.artist}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Volume2 style={{ width: '1rem', height: '1rem', color: '#52525b', flexShrink: 0 }} />
                <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1, accentColor: '#eab308', cursor: 'pointer' }} />
              </div>
            </div>
          )}

          <div className="chart-list">
            <div className="chart-header" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp style={{ width: '1rem', height: '1rem' }} />
              Trending Songs
            </div>
            <div>
              {topCharts.map((song, i) => (
                <div key={song.id} className="chart-row" onClick={() => selectSong(song)} style={{ background: selectedSong?.id === song.id ? 'rgba(255,255,255,0.06)' : '' }}>
                  <span className="chart-rank">{i + 1}</span>
                  <img src={song.thumbnail} alt="" className="chart-thumb" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '4px', objectFit: 'cover' }} />
                  <div className="search-result-info">
                    <div className="search-result-title">{song.title}</div>
                    <div className="search-result-artist">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Typing Game */}
        <section>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', color: '#52525b', gap: '1rem' }}>
              <div className="spinner" />
              <p>Syncing lyrics and audio...</p>
            </div>
          ) : selectedSong && lyrics.length > 0 ? (
            <TypingGame
              lyrics={lyrics}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(p => !p)}
              onRestart={handleRestart}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', color: '#52525b', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
              <Music style={{ width: '3rem', height: '3rem', marginBottom: '1rem', opacity: 0.2 }} />
              <p>Select a song to start the typing game</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
