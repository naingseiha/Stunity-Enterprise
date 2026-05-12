-- Profile view analytics for creator, educator, and learner profile performance.
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "viewerId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT DEFAULT 'profile',
    "dwellMs" INTEGER,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_views_profileUserId_idx" ON "profile_views"("profileUserId");
CREATE INDEX "profile_views_viewerId_idx" ON "profile_views"("viewerId");
CREATE INDEX "profile_views_viewedAt_idx" ON "profile_views"("viewedAt");
CREATE INDEX "profile_views_profileUserId_viewedAt_idx" ON "profile_views"("profileUserId", "viewedAt" DESC);
CREATE INDEX "profile_views_profile_viewer_viewed_idx" ON "profile_views"("profileUserId", "viewerId", "viewedAt" DESC);
CREATE INDEX "profile_views_viewer_profile_viewed_idx" ON "profile_views"("viewerId", "profileUserId", "viewedAt" DESC);

ALTER TABLE "profile_views"
ADD CONSTRAINT "profile_views_profileUserId_fkey"
FOREIGN KEY ("profileUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profile_views"
ADD CONSTRAINT "profile_views_viewerId_fkey"
FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
