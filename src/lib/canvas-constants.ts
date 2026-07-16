import { Pencil, Square, Circle, Triangle, PenTool, Hexagon } from 'lucide-react';
import type { WorkProfile } from '../types';

export type ToolType = 'pencil' | 'rect' | 'circle' | 'triangle' | 'curve' | 'polygon';
export type BrushType = 'pencil' | 'circle' | 'spray' | 'ink' | 'charcoal' | 'watercolor' | 'oil' | 'charcoal_pro' | 'spray_pro' | 'watercolor_pro' | 'smudge';
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'difference' | 'color-dodge' | 'darken' | 'lighten';

export const MAX_HISTORY = 50;
export const MAX_HISTORY_SIZE_BYTES = 500_000;
export const STORAGE_KEY = 'vozart-canvas-state';

export const TOOLS: { type: ToolType; icon: typeof Pencil; label: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pincel' },
  { type: 'rect', icon: Square, label: 'Rectángulo' },
  { type: 'circle', icon: Circle, label: 'Círculo' },
  { type: 'triangle', icon: Triangle, label: 'Triángulo' },
  { type: 'curve', icon: PenTool, label: 'Curva Bezier' },
  { type: 'polygon', icon: Hexagon, label: 'Polígono' },
];

export const DEFAULT_SWATCHES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#111827', '#FFFFFF'];
export const COLOR_SWATCHES = DEFAULT_SWATCHES;

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiplicar' },
  { value: 'screen', label: 'Pantalla' },
  { value: 'overlay', label: 'Superponer' },
  { value: 'soft-light', label: 'Luz suave' },
  { value: 'difference', label: 'Diferencia' },
  { value: 'color-dodge', label: 'Sobreexponer' },
  { value: 'darken', label: 'Oscurecer' },
  { value: 'lighten', label: 'Aclarar' },
];

export const profileHint: Record<WorkProfile, string> = {
  artist: 'Perfil artista: color, textura y composición libre.',
  education: 'Perfil educación: crea recursos visuales claros y explicativos.',
  architecture: 'Perfil arquitectura: usa grid, formas y proporciones.',
  medical: 'Perfil médico: prioriza diagramas claros y etiquetas.',
  legal: 'Perfil legal: prioriza esquemas, flujos y evidencias visuales.',
  diagram: 'Perfil diagrama: estructura ideas con formas, texto y relaciones.',
};
