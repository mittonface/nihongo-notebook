import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://nihongo.mittn.ca',
  integrations: [mdx(), svelte()],
});
