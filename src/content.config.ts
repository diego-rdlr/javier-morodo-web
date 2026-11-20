import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Fecha de WordPress, `YYYY-MM-DDTHH:mm:ss`, sin zona (hora del sitio). */
    date: z.string(),
    slug: z.string(),
    wpId: z.number(),
    categories: z.array(z.object({ nombre: z.string(), slug: z.string() })),
    tags: z.array(z.string()),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageWidth: z.number().optional(),
    imageHeight: z.number().optional(),
  }),
});

export const collections = { blog };
