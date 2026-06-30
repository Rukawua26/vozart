import type { WorkProfile } from '../types';

export interface ProfilePreset {
  key: WorkProfile;
  label: string;
  description: string;
  palette: string[];
  brush: 'pencil' | 'circle' | 'spray' | 'ink' | 'charcoal' | 'watercolor';
  brushWidth: number;
  brushOpacity: number;
  defaultShape: 'rect' | 'circle' | 'triangle' | 'pencil';
  strokeWidth: number;
  objectSize: number;
  showGrid: boolean;
  layersNames: string[];
  aiHint: string;
}

export const PROFILE_PRESETS: Record<WorkProfile, ProfilePreset> = {
  artist: {
    key: 'artist',
    label: 'Artista',
    description: 'Pinzel libre, colores expresivos y composicion abierta.',
    palette: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#111827', '#FFFFFF'],
    brush: 'watercolor',
    brushWidth: 6,
    brushOpacity: 1,
    defaultShape: 'pencil',
    strokeWidth: 2,
    objectSize: 140,
    showGrid: false,
    layersNames: ['Pincel', 'Capa Base IA'],
    aiHint: 'Sugiere composiciones expresivas, paletas contrastantes y trazos organicos.',
  },
  architecture: {
    key: 'architecture',
    label: 'Arquitectura',
    description: 'Lineas limpias, proporciones, grid activo, paleta neutra.',
    palette: ['#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1', '#1E293B', '#F1F5F9', '#FFFFFF'],
    brush: 'ink',
    brushWidth: 2,
    brushOpacity: 1,
    defaultShape: 'rect',
    strokeWidth: 1,
    objectSize: 180,
    showGrid: true,
    layersNames: ['Boceto', 'Cotas', 'Capa Tecnica'],
    aiHint: 'Genera alzados, plantas y volumenes con lineas rectas y grid visible.',
  },
  medical: {
    key: 'medical',
    label: 'Médico',
    description: 'Diagramas claros, etiquetas legibles, paleta sanitaria.',
    palette: ['#0EA5E9', '#22D3EE', '#10B981', '#F87171', '#A78BFA', '#FACC15', '#0F172A', '#FFFFFF'],
    brush: 'circle',
    brushWidth: 3,
    brushOpacity: 1,
    defaultShape: 'circle',
    strokeWidth: 2,
    objectSize: 110,
    showGrid: false,
    layersNames: ['Organo', 'Etiquetas', 'Anotacion'],
    aiHint: 'Sugiere organos o diagramas anatomicos con etiquetas claras y contornos limpios.',
  },
  legal: {
    key: 'legal',
    label: 'Legal',
    description: 'Esquemas, flujos de proceso, jerarquias visuales.',
    palette: ['#1E3A8A', '#2563EB', '#1D4ED8', '#7C3AED', '#475569', '#0F172A', '#E2E8F0', '#FFFFFF'],
    brush: 'ink',
    brushWidth: 3,
    brushOpacity: 1,
    defaultShape: 'rect',
    strokeWidth: 2,
    objectSize: 160,
    showGrid: true,
    layersNames: ['Hechos', 'Relaciones', 'Resumen'],
    aiHint: 'Propone flujogramas, lineas de tiempo y relaciones entre partes con cajas claras.',
  },
  education: {
    key: 'education',
    label: 'Educación',
    description: 'Recursos visuales claros y didacticos.',
    palette: ['#22C55E', '#14B8A6', '#F59E0B', '#EF4444', '#3B82F6', '#A855F7', '#0F172A', '#FFFFFF'],
    brush: 'spray',
    brushWidth: 5,
    brushOpacity: 1,
    defaultShape: 'circle',
    strokeWidth: 2,
    objectSize: 130,
    showGrid: false,
    layersNames: ['Titulo', 'Concepto', 'Ejemplos'],
    aiHint: 'Crea esquemas pedagogicos con titulo, conceptos y ejemplos visuales.',
  },
  diagram: {
    key: 'diagram',
    label: 'Diagramas',
    description: 'Formas, conectores y relaciones visuales.',
    palette: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0F172A', '#FFFFFF'],
    brush: 'charcoal',
    brushWidth: 4,
    brushOpacity: 1,
    defaultShape: 'rect',
    strokeWidth: 2,
    objectSize: 150,
    showGrid: false,
    layersNames: ['Nodos', 'Conexiones', 'Leyenda'],
    aiHint: 'Diagramas con nodos conectados y lineas claras. Pensamiento estructurado.',
  },
};

export function getProfilePreset(key: WorkProfile): ProfilePreset {
  return PROFILE_PRESETS[key] ?? PROFILE_PRESETS.artist;
}
