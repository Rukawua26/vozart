export interface AIAction {
  action: 'ADD_SHAPE' | 'CHANGE_BG' | 'CLEAR_CANVAS' | 'GENERATE_IMAGE' | 'ERROR';
  shape?: 'rect' | 'circle' | 'triangle';
  color?: string;
  size?: number;
  prompt?: string;
  message?: string;
}

export type AppCommand =
  | { type: 'AI_ACTION'; data: AIAction }
  | { type: 'ERROR'; data?: AIAction; message?: string };
