import React from 'react';

interface VideoPlayerProps {
  url: string;
  textTracks?: {
    kind: string;
    locale: string;
    label?: string | null;
    url?: string | null;
    isDefault?: boolean;
  }[];
  preferredLocale?: string;
}

const normalizeTrackLocale = (value: string | null | undefined) => {
  const normalized = String(value || 'en').trim().toLowerCase();
  if (normalized.startsWith('km') || normalized === 'kh') return 'km';
  return 'en';
};

export function VideoPlayer({ url, textTracks = [], preferredLocale = 'en' }: VideoPlayerProps) {
  const getEmbedUrl = (videoUrl: string) => {
    try {
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const videoId = videoUrl.includes('youtu.be') 
          ? videoUrl.split('youtu.be/')[1].split('?')[0]
          : new URL(videoUrl).searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : null;
      }
      if (videoUrl.includes('vimeo.com')) {
        const match = videoUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
        return match ? `https://player.vimeo.com/video/${match[1]}` : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const embedUrl = getEmbedUrl(url);

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  // Fallback for direct video links (mp4, webm)
  const tracksWithUrl = textTracks.filter((track) => track.url && track.kind !== 'TRANSCRIPT');
  const normalizedPreferredLocale = normalizeTrackLocale(preferredLocale);
  const preferredTrack =
    tracksWithUrl.find((track) => normalizeTrackLocale(track.locale) === normalizedPreferredLocale)
    || tracksWithUrl.find((track) => track.isDefault)
    || tracksWithUrl[0];

  return (
    <video
      controls
      className="w-full h-full"
      controlsList="nodownload"
    >
      <source src={url} />
      {tracksWithUrl
        .map((track) => (
          <track
            key={`${track.kind}-${track.locale}-${track.url}`}
            kind={track.kind === 'CAPTION' ? 'captions' : 'subtitles'}
            src={track.url || ''}
            srcLang={track.locale}
            label={track.label || track.locale}
            default={track === preferredTrack}
          />
        ))}
      Your browser does not support the video tag.
    </video>
  );
}
