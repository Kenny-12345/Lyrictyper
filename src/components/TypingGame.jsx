import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RefreshCw, Trophy, Zap } from 'lucide-react';

// Characters the user never needs to type — auto-accepted
const isPunct = (char) => /[^\w\s]/.test(char);

// How many lyric lines get merged per difficulty
const LINES_PER_CHUNK = { easy: 4, medium: 2, hard: 1 };

export default function TypingGame({ lyrics, currentTime, isPlaying, onTogglePlay, onRestart }) {
  const [difficulty, setDifficulty] = useState('hard');
  const [chunkIndex, setChunkIndex] = useState(0);
  const [typedInput, setTypedInput] = useState('');
  const [stats, setStats] = useState({
    correctChars: 0,
    errors: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
  });

  const inputRef = useRef(null);
  const linesPerChunk = LINES_PER_CHUNK[difficulty];

  // ─── Group lyrics into chunks based on difficulty ──────────────────────────
  const chunks = (() => {
    if (!lyrics || lyrics.length === 0) return [];
    const result = [];
    for (let i = 0; i < lyrics.length; i += linesPerChunk) {
      const group = lyrics.slice(i, i + linesPerChunk);
      result.push({
        text: group.map(l => l.text).join(' '),
        startTime: group[0].time,
        endTime: group[group.length - 1].time,
      });
    }
    return result;
  })();

  const activeChunk = chunks[chunkIndex] || null;
  const prevChunk = chunks[chunkIndex - 1] || null;
  const nextChunk = chunks[chunkIndex + 1] || null;

  // ─── Sync chunk to music time ──────────────────────────────────────────────
  useEffect(() => {
    if (!chunks.length) return;
    let newIndex = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].startTime <= currentTime) newIndex = i;
      else break;
    }
    if (newIndex !== chunkIndex) {
      setChunkIndex(newIndex);
      setTypedInput('');
    }
  }, [currentTime, difficulty, lyrics]);

  // ─── Reset on difficulty or song change ───────────────────────────────────
  useEffect(() => {
    setChunkIndex(0);
    setTypedInput('');
    setStats({ correctChars: 0, errors: 0, score: 0, streak: 0, maxStreak: 0 });
  }, [difficulty, lyrics]);

  // ─── Keep input focused ────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying && inputRef.current) inputRef.current.focus();
  }, [isPlaying, chunkIndex]);

  // ─── Handle typing ─────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    if (!activeChunk) return;
    let val = e.target.value;
    const target = activeChunk.text;
    if (val.length > target.length) return;

    // Auto-skip punctuation characters — jump past them automatically
    while (val.length < target.length && isPunct(target[val.length])) {
      val += target[val.length];
    }

    const charIndex = val.length - 1;
    if (charIndex < 0) { setTypedInput(val); return; }

    // Only score the character if it's not punctuation (punct is free)
    const isCorrect = isPunct(target[charIndex]) ? true : val[charIndex] === target[charIndex];

    setStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newMax = Math.max(prev.maxStreak, newStreak);
      const scoreAdd = isCorrect && !isPunct(target[charIndex]) ? 10 + Math.floor(newStreak / 5) * 2 : 0;
      const newErrors = isCorrect ? prev.errors : prev.errors + 1;
      const newCorrect = (isCorrect && !isPunct(target[charIndex])) ? prev.correctChars + 1 : prev.correctChars;
      return { ...prev, streak: newStreak, maxStreak: newMax, score: prev.score + scoreAdd, errors: newErrors, correctChars: newCorrect };
    });

    setTypedInput(val);

    // Completed chunk — clear for next
    if (val === target) {
      setTimeout(() => setTypedInput(''), 150);
    }
  };

  // ─── Render characters monkeytype style ───────────────────────────────────
  const renderChunk = () => {
    if (!activeChunk) return <span style={{ color: '#52525b', fontStyle: 'italic' }}>Waiting for intro...</span>;
    return activeChunk.text.split('').map((char, i) => {
      const punct = isPunct(char);
      let color = '#52525b'; // future

      if (i < typedInput.length) {
        // Punctuation always shows as auto-accepted (dim gold)
        color = punct ? '#a16207' : (typedInput[i] === char ? '#f4f4f5' : '#ef4444');
      } else if (i === typedInput.length) {
        color = '#f4f4f5'; // cursor position
      }

      const isError = !punct && i < typedInput.length && typedInput[i] !== char;

      return (
        <span
          key={i}
          style={{
            color,
            background: isError ? 'rgba(239,68,68,0.15)' : 'transparent',
            borderRadius: isError ? '2px' : '0',
            position: 'relative',
            // Punct chars are slightly smaller to visually distinguish
            fontSize: punct ? '0.85em' : '1em',
            opacity: punct && i >= typedInput.length ? 0.4 : 1,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
          {i === typedInput.length && isPlaying && <span className="typing-caret" />}
        </span>
      );
    });
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalTyped = stats.correctChars + stats.errors;
  const accuracy = totalTyped > 0 ? Math.round((stats.correctChars / totalTyped) * 100) : 100;
  const elapsedMinutes = currentTime / 60;
  const rawWpm = elapsedMinutes > 0.05 ? Math.round((stats.correctChars / 5) / elapsedMinutes) : 0;
  const isFinished = chunks.length > 0 && chunkIndex >= chunks.length - 1 && currentTime > (chunks[chunks.length - 1]?.endTime || 0) + 5;

  return (
    <div className="game-container">
      {/* Difficulty selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {['easy', 'medium', 'hard'].map(d => (
          <button
            key={d}
            onClick={() => { setDifficulty(d); onRestart(); }}
            style={{
              padding: '0.4rem 1.1rem',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: difficulty === d
                ? d === 'easy' ? '#22c55e' : d === 'medium' ? '#eab308' : '#ef4444'
                : 'rgba(255,255,255,0.04)',
              borderColor: difficulty === d
                ? d === 'easy' ? '#22c55e' : d === 'medium' ? '#eab308' : '#ef4444'
                : 'rgba(255,255,255,0.1)',
              color: difficulty === d ? '#000' : '#71717a',
            }}
          >
            {d === 'easy' ? `Easy (4 lines)` : d === 'medium' ? `Medium (2 lines)` : `Hard (1 line)`}
          </button>
        ))}
      </div>

      {/* Stats row */}
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

      {/* Typing viewport */}
      <div className="typing-viewport" onClick={() => inputRef.current?.focus()}>
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
              <Play fill="black" style={{ width: '1.5rem', height: '1.5rem' }} />
              Start Typing Game
            </motion.button>
            <p style={{ color: '#52525b', fontSize: '0.75rem', marginTop: '0.75rem' }}>
              {difficulty === 'easy' ? 'Type 4 lines at a time — nice and relaxed!' :
               difficulty === 'medium' ? 'Type 2 lines at a time — find your rhythm!' :
               'Type each line as it appears — stay on beat!'}
            </p>
          </div>
        )}

        <div className="lyrics-scroller">
          {/* Previous chunk (faded) */}
          <div className="lyric-line-prev">
            {prevChunk ? prevChunk.text.slice(0, 60) + (prevChunk.text.length > 60 ? '...' : '') : '\u00A0'}
          </div>

          {/* Active chunk — character by character */}
          <div className="lyric-line-active" style={{
            fontSize: difficulty === 'easy' ? '1.1rem' : difficulty === 'medium' ? '1.4rem' : '1.8rem',
            lineHeight: 1.8,
          }}>
            {renderChunk()}
          </div>

          {/* Next chunk preview */}
          <div className="lyric-line-next">
            {nextChunk ? nextChunk.text.slice(0, 60) + (nextChunk.text.length > 60 ? '...' : '') : '\u00A0'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="game-controls">
        <button className="control-btn" onClick={onTogglePlay}>
          {isPlaying
            ? <Pause style={{ width: '1.25rem', height: '1.25rem' }} />
            : <Play style={{ width: '1.25rem', height: '1.25rem' }} />}
          {isPlaying ? 'Pause' : 'Resume'}
        </button>
        <button className="control-btn" onClick={onRestart}>
          <RefreshCw style={{ width: '1.25rem', height: '1.25rem' }} />
          Restart
        </button>
      </div>

      {/* Results modal */}
      {isFinished && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="results-overlay"
        >
          <div className="results-card">
            <Trophy style={{ width: '4rem', height: '4rem', color: '#eab308', display: 'block', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Performance Summary</h2>
            <p style={{ color: '#71717a', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Difficulty: <strong style={{ color: difficulty === 'easy' ? '#22c55e' : difficulty === 'medium' ? '#eab308' : '#ef4444', textTransform: 'capitalize' }}>{difficulty}</strong>
            </p>
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
