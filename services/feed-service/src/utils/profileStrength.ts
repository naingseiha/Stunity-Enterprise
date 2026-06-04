// Pure profile-strength calculation shared between the read endpoint and any
// profile-mutation path that wants to keep `profileCompleteness` fresh.

export interface ProfileStrengthInput {
  profilePictureUrl?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  careerGoals?: string | null;
  skillCount: number;
  experienceCount: number;
}

export interface ProfileStrengthResult {
  completeness: number;
  missingFields: string[];
  nextAction: string;
}

export function computeProfileStrength(input: ProfileStrengthInput): ProfileStrengthResult {
  const fields = [
    { name: 'Profile Picture', completed: !!input.profilePictureUrl, nudge: 'Add a profile picture' },
    { name: 'Headline', completed: !!input.headline, nudge: 'Add a headline' },
    { name: 'Bio', completed: !!input.bio, nudge: 'Add a bio' },
    { name: 'Location', completed: !!input.location, nudge: 'Add your location' },
    { name: 'Career Goals', completed: !!input.careerGoals, nudge: 'Add your career goals' },
    { name: 'Skills', completed: input.skillCount > 0, nudge: 'Add at least one skill' },
    { name: 'Experience', completed: input.experienceCount > 0, nudge: 'Add your experience' },
  ];

  const completedCount = fields.filter((f) => f.completed).length;
  const missingFields = fields.filter((f) => !f.completed);
  const completeness = Math.round((completedCount / fields.length) * 100);

  let nextAction: string;
  if (missingFields.length > 0) {
    const nextTier = Math.min(100, Math.round(((completedCount + 1) / fields.length) * 100));
    nextAction = `${missingFields[0].nudge} to reach ${nextTier}%!`;
  } else {
    nextAction = "Profile complete! You're an all-star.";
  }

  return {
    completeness,
    missingFields: missingFields.map((f) => f.name),
    nextAction,
  };
}
