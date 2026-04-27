ALTER TABLE "courses"
ADD COLUMN "sourceLocale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "supportedLocales" TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[];
