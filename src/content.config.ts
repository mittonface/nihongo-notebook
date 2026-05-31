import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1', 'unranked']).default('unranked'),
    tags: z.array(z.string()).default([]),
    source: z.string().optional(),
    date: z.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons };
