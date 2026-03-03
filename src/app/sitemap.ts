import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://openclaws.biz', lastModified: new Date() },
    { url: 'https://openclaws.biz/login', lastModified: new Date() },
    { url: 'https://openclaws.biz/privacy', lastModified: new Date() },
    { url: 'https://openclaws.biz/terms', lastModified: new Date() },
    { url: 'https://openclaws.biz/docs', lastModified: new Date() },
  ];
}
