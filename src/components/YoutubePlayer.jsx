import { useEffect, useRef, useState } from 'react';

export default function YoutubePlayer({ videoId, isPlaying, volume, onTimeUpdate, onEnded, onReady }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Load YouTube API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  // Initialize/Update player instance
  useEffect(() => {
    let playerInstance = null;

    const initPlayer = () => {
      if (!containerRef.current || !window.YT) return;

      playerInstance = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId || '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            setIsPlayerReady(true);
            event.target.setVolume(volume);
            if (onReady) onReady(event.target);
          },
          onStateChange: (event) => {
            const YT_STATES = window.YT?.PlayerState;
            if (!YT_STATES) return;

            if (event.data === YT_STATES.ENDED && onEnded) {
              onEnded();
            }
          },
        },
      });
      playerRef.current = playerInstance;
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
    };
  }, [videoId]); // Re-create player when videoId changes

  // Handle Play/Pause
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      console.warn('Play/Pause state error:', e);
    }
  }, [isPlaying, isPlayerReady, videoId]);

  // Handle Volume Change
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;
    playerRef.current.setVolume(volume);
  }, [volume, isPlayerReady]);

  // Handle Time Tracking
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        onTimeUpdate(currentTime);
      }
    }, 100); // 100ms polling for high precision synced lyrics

    return () => clearInterval(interval);
  }, [isPlaying, isPlayerReady, onTimeUpdate]);

  return (
    <div className="video-player-frame">
      <div ref={containerRef} />
    </div>
  );
}
