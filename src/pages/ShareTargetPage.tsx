import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

function extractYouTubeId(raw: string | null): string | null {
  if (!raw) return null;
  // Find first URL-looking token in the string
  const urlMatch = raw.match(/https?:\/\/[^\s]+/);
  const candidate = urlMatch ? urlMatch[0] : raw.trim();
  try {
    const u = new URL(candidate);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      if (id) return id;
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      // /shorts/ID or /embed/ID or /live/ID
      const m = u.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/);
      if (m) return m[2];
    }
  } catch {
    // not a URL, try raw id pattern
  }
  const idMatch = candidate.match(/[A-Za-z0-9_-]{11}/);
  return idMatch ? idMatch[0] : null;
}

export default function ShareTargetPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const text = params.get('text');
  const url = params.get('url');
  const title = params.get('title');
  const videoId =
    extractYouTubeId(url) ||
    extractYouTubeId(text) ||
    extractYouTubeId(title);

  useEffect(() => {
    if (videoId) {
      navigate(`/youtube/video/${videoId}`, { replace: true });
    }
  }, [videoId, navigate]);

  if (videoId) return null;
  return <Navigate to="/youtube" replace />;
}
