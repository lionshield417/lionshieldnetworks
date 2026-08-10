// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	site: 'https://lionshieldnetworks.com',

	integrations: [
		sitemap({
			filter: (page) => !page.includes('/client-portal'),
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});