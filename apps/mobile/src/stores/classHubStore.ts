import { create } from 'zustand';
import { classHubApi, ClassAnnouncement, ClassMaterial, ClassAssignment } from '../api/classHub';

interface ClassHubState {
  announcements: Record<string, ClassAnnouncement[]>;
  materials: Record<string, ClassMaterial[]>;
  assignments: Record<string, ClassAssignment[]>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;

  fetchAnnouncements: (classId: string, force?: boolean) => Promise<void>;
  fetchMaterials: (classId: string, force?: boolean) => Promise<void>;
  fetchAssignments: (classId: string, force?: boolean) => Promise<void>;
}

export const useClassHubStore = create<ClassHubState>((set, get) => ({
  announcements: {},
  materials: {},
  assignments: {},
  loading: {},
  error: {},

  fetchAnnouncements: async (classId, force = false) => {
    if (!force && get().announcements[classId]) return;
    set((state) => ({ loading: { ...state.loading, [`announcements_${classId}`]: true } }));
    try {
      const data = await classHubApi.getAnnouncements(classId);
      set((state) => ({
        announcements: { ...state.announcements, [classId]: data },
        loading: { ...state.loading, [`announcements_${classId}`]: false },
      }));
    } catch (err: any) {
      set((state) => ({
        error: { ...state.error, [`announcements_${classId}`]: err.message },
        loading: { ...state.loading, [`announcements_${classId}`]: false },
      }));
    }
  },

  fetchMaterials: async (classId, force = false) => {
    if (!force && get().materials[classId]) return;
    set((state) => ({ loading: { ...state.loading, [`materials_${classId}`]: true } }));
    try {
      const data = await classHubApi.getMaterials(classId);
      set((state) => ({
        materials: { ...state.materials, [classId]: data },
        loading: { ...state.loading, [`materials_${classId}`]: false },
      }));
    } catch (err: any) {
      set((state) => ({
        error: { ...state.error, [`materials_${classId}`]: err.message },
        loading: { ...state.loading, [`materials_${classId}`]: false },
      }));
    }
  },

  fetchAssignments: async (classId, force = false) => {
    if (!force && get().assignments[classId]) return;
    set((state) => ({ loading: { ...state.loading, [`assignments_${classId}`]: true } }));
    try {
      const data = await classHubApi.getAssignments(classId);
      set((state) => ({
        assignments: { ...state.assignments, [classId]: data },
        loading: { ...state.loading, [`assignments_${classId}`]: false },
      }));
    } catch (err: any) {
      set((state) => ({
        error: { ...state.error, [`assignments_${classId}`]: err.message },
        loading: { ...state.loading, [`assignments_${classId}`]: false },
      }));
    }
  },
}));
