import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RefreshCw, Trophy, Zap, AlertCircle } from 'lucide-react';

export default function TypingGame({ lyrics, currentTime, isPlaying, onTogglePlay, onRestart }) {
  // Game states
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [typedInput, setTypedInput] = useState('');
  const [stats, setStats] = useState({
    correctChars: 0,
    totalChars: 0,
    errors: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
  });

  const inputRef = useRef(null);

  // Sync current lyric line index with currentTime
  useEffect(() => {
    if (!lyrics || lyrics.length === 0) return;

    // Find the current active line based on current time
    // We want the line whose time is <= currentTime, but the next line is > currentTime
    let activeIndex = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) {
        activeIndex = i;
      } else {
        break;
      }
    }

    if (activeIndex !== currentLineIndex) {
      // User moved to a new line (either auto-advanced or seeked)
      // Accumulate stats from the completed line before resetting input
      if (typedInput.length > 0) {
        evaluateLineProgress();
      }
      setCurrentLineIndex(activeIndex);
      setTypedInput('');
    }
  }, [currentTime, lyrics]);

  // Keep input focused
  useEffect(() => {
    if (isPlaying && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPlaying, currentLineIndex]);

  const activeLine = lyrics && lyrics[currentLineIndex] ? lyrics[currentLineIndex].text : '';
  const nextLine = lyrics && lyrics[currentLineIndex + 1] ? lyrics[currentLineIndex + 1].text : '';
  const prevLine = lyrics && lyrics[currentLineIndex - 1] ? lyrics[currentLineIndex - 1].text : '';

  // Calculate stats for completed typing when line changes
  const evaluateLineProgress = () => {
    const targetText = activeLine;
    let correct = 0;
    let errors = 0;

    for (let i = 0; i < typedInput.length; i++) {
      if (typedInput[i] === targetText[i]) {
        correct++;
      } else {
        errors++;
      }
    }

    setStats(prev => {
      const lineScore = correct * 10 - errors * 5;
      return {
        ...prev,
        correctChars: prev.correctChars + correct,
        totalChars: prev.totalChars + targetText.length,
        errors: prev.errors + errors,
        score: Math.max(0, prev.score + lineScore),
      };
    });
  };

  // Handle typing input
  const handleInputChange = (e) => {
    const val = e.target.value;
    
    // Don't let player type past target line length
    if (val.length > activeLine.length) return;

    const charIndex = val.length - 1;
    const isCorrect = val[charIndex] === activeLine[charIndex];

    setStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newMax = Math.max(prev.maxStreak, newStreak);
      const scoreAdd = isCorrect ? (10 + Math.floor(newStreak / 5) * 2) : 0; // Streak multipliers!
      
      return {
        ...prev,
        streak: newStreak,
        maxStreak: newMax,
        score: prev.score + scoreAdd,
      };
    });

    setTypedInput(val);

    // Auto-advance if fully typed correct
    if (val === activeLine && currentLineIndex < lyrics.length - 1) {
      // Finished line perfectly
      setStats(prev => ({
        ...prev,
        correctChars: prev.correctChars + activeLine.length,
        totalChars: prev.totalChars + activeLine.length,
      }));
      // Note: We don't advance the song audio, just wait for the timeline,
      // but visually we can clear the input so they feel they did it.
      setTypedInput('');
    }
  };

  // Calculate live accuracy
  const totalTyped = stats.correctChars + stats.errors + (typedInput.length);
  const accuracy = totalTyped > 0 
    ? Math.round(((stats.correctChars + typedInput.split('').filter((c, i) => c === activeLine[i]).length) / totalTyped) * 100)
    : 100;

  // Calculate live WPM (assuming 5 characters = 1 word)
  // Elapsed time in minutes
  const elapsedMinutes = currentTime / 60;
  const rawWpm = elapsedMinutes > 0.05 
    ? Math.round((stats.correctChars / 5) / elapsedMinutes)
    : 0;

  // Render character styles for Monkeytype style UI
  const renderLineCharacters = () => {
    return activeLine.split('').map((char, index) => {
      let className = 'char-future';
      if (index < typedInput.length) {
        className = typedInput[index] === char ? 'char-correct' : 'char-incorrect';
      } else if (index === typedInput.length) {
        className = 'char-current';
      }

      return (
        <span key={index} className={`typing-char ${className}`}>
          {char === ' ' ? '\u00A0' : char}
          {index === typedInput.length && isPlaying && <span className="typing-caret" />}
        </span>
      );
    });
  };

  return (
    <div className="game-container">
      {/* Top dashboard stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">WPM</span>
          <span className="stat-value">{rawWpm}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ACCURACY</span>
          <span className="stat-value">{accuracy}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">SCORE</span>
          <span className="stat-value" style={{ color: '#eab308' }}>{stats.score}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">STREAK</span>
          <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Zap style={{ width: '1.25rem', height: '1.25rem', color: '#eab308', fill: '#eab308' }} />
            {stats.streak}
          </span>
        </div>
      </div>

      {/* Main typing viewport */}
      <div className="typing-viewport" onClick={() => inputRef.current?.focus()}>
        {/* Hidden input field for mobile/desktop typing trigger */}
        <input
          ref={inputRef}
          type="text"
          value={typedInput}
          onChange={handleInputChange}
          disabled={!isPlaying}
          className="hidden-typing-input"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {!isPlaying && currentTime === 0 && (
          <div className="click-to-start-overlay">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onTogglePlay}
              className="start-game-btn"
            >
              <Play fill="black" style={{ width: '1.5rem', height: '1.5rem' }} /> Start Typing Game
            </motion.button>
            <p style={{ color: '#52525b', fontSize: '0.75rem', marginTop: '0.75rem' }}>Type the lyrics as they sync to the beat of the song!</p>
          </div>
        )}

        <div className="lyrics-scroller">
          {/* Previous line (faded) */}
          <div className="lyric-line-prev">
            {prevLine || '\u00A0'}
          </div>

          {/* Current typing line */}
          <div className="lyric-line-active">
            {activeLine ? renderLineCharacters() : (
              <span className="text-muted italic animate-pulse">Waiting for intro beats...</span>
            )}
          </div>

          {/* Next line preview */}
          <div className="lyric-line-next">
            {nextLine || '\u00A0'}
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="game-controls">
        <button className="control-btn" onClick={onTogglePlay}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isPlaying ? 'Pause' : 'Resume'}
        </button>
        <button className="control-btn" onClick={onRestart}>
          <RefreshCw className="w-5 h-5" />
          Restart Track
        </button>
      </div>

      {/* Final Trophy Scorecard Modal */}
      {lyrics && currentLineIndex >= lyrics.length - 1 && currentTime > lyrics[lyrics.length - 1].time + 5 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="results-overlay"
        >
          <div className="results-card">
            <Trophy style={{ width: '4rem', height: '4rem', color: '#eab308', display: 'block', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Performance Summary</h2>
            <div className="results-grid">
              <div className="res-item"><span>Avg WPM</span><strong>{rawWpm}</strong></div>
              <div className="res-item"><span>Accuracy</span><strong>{accuracy}%</strong></div>
              <div className="res-item"><span>Final Score</span><strong>{stats.score}</strong></div>
              <div className="res-item"><span>Max Streak</span><strong>{stats.maxStreak}</strong></div>
            </div>
            <button className="start-game-btn" style={{ marginTop: '1.5rem', width: '100%' }} onClick={onRestart}>
              Play Again
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
