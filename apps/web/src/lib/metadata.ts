import { Metadata } from 'next';

const siteConfig = {
  name: 'Stunity Enterprise',
  description: 'The ultimate all-in-one platform for modern schools and vibrant social learning communities.',
  url: 'https://stunity.app',
  ogImage: 'https://stunity.app/og-image.png',
  links: {
    twitter: 'https://twitter.com/stunityapp',
    github: 'https://github.com/stunity',
  },
};

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  icons = '/favicon.ico',
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title: {
      default: title,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
      type: 'website',
      siteName: siteConfig.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@stunityapp',
    },
    icons,
    metadataBase: new URL(siteConfig.url),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

export const commonMetadata = {
  feed: constructMetadata({
    title: 'Social Feed',
    description: 'Connect with fellow students, join study clubs, and share your learning journey.',
  }),
  dashboard: constructMetadata({
    title: 'School Dashboard',
    description: 'Manage your school efficiently with real-time analytics and management tools.',
  }),
  learn: constructMetadata({
    title: 'Learn Hub',
    description: 'Access courses, quizzes, and educational resources to boost your skills.',
  }),
};
