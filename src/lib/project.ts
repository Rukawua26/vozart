import type { Layer, ProjectSnapshot, WorkProfile } from '../types';
import { getProfilePreset } from '../services/profilePresets';

export function createProjectId() {
  return `project-${Date.now()}`;
}

export function makeLayersForProfile(profile: WorkProfile): Layer[] {
  return getProfilePreset(profile).layersNames.map((name, index) => ({
    id: `layer-${profile}-${index}-${Date.now()}`,
    name,
    visible: true,
    locked: false,
    opacity: 1,
  }));
}

export const PROJECTS_STORAGE_KEY = 'vozart-projects';

export function parseStoredProjects(): ProjectSnapshot[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function downloadJSON(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function storeProject(snapshot: ProjectSnapshot) {
  const prev = parseStoredProjects();
  const next = [snapshot, ...prev.filter(p => p.id !== snapshot.id)].slice(0, 12);
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
  return next;
}
