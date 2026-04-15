import React from 'react';

interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
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
  return (
    <video
      controls
      className="w-full h-full"
      controlsList="nodownload"
    >
      <source src={url} />
      Your browser does not support the video tag.
    </video>
  );
}
