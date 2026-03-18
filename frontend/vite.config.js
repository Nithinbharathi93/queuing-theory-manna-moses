import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    Sitemap({
      hostname: 'https://agilizar-portal.vercel.app',
      outDir: 'dist',
      sitemapFileName: 'sitemap.xml',
      robotsFileName: 'robots.txt',
      exclude: ['/admin/*'],
      dynamicRoutes: async () => {
        const { data: posts } = await supabase.from('posts').select('slug, updated_at');
        return posts.map(post => ({
          url: `/blog/${post.slug}`,
          lastmod: post.updated_at,
        }));
      },
    }),
  ],
  base: '/' || VITE_BASE_PATH,
  
})
