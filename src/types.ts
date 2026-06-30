export interface AIAction {
  action: string;
  shape?: string;
  color?: string;
  size?: number;
  prompt?: string;
  text?: string;
  message?: string;
  left?: number;
  top?: number;
  opacity?: number;
  target?: string;
  value?: number;
  scaleX?: number;
  scaleY?: number;
  actions?: AIAction[];
  reason?: string;
  sceneDescription?: string;
  transition?: string;
  duration?: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  opacity?: number;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  easyRead: boolean;
  largeUi: boolean;
  reduceMotion: boolean;
}

export type WorkProfile = 'artist' | 'education' | 'architecture' | 'medical' | 'legal' | 'diagram';

export type AppCommand =
  | { type: 'AI_ACTION'; data: AIAction; timestamp?: string }
  | { type: 'ERROR'; data?: AIAction; message?: string; timestamp?: string };

export interface UserPattern {
  type: 'colorPreference' | 'shapePreference' | 'sizePreference' | 'stylePreference';
  value: string;
  frequency: number;
}

export interface AIContext {
  recentCommands: string[];
  recentActions: AIAction[];
  patterns: UserPattern[];
  sessionId: string;
  activeLayerId: string | null;
  sessionStartTime: number;
  lastUserInteraction: number;
}

export interface StreamStatus {
  pendingActions: number;
  streaming: boolean;
}

export type StreamMessage =
  | { type: 'START'; sessionId: string }
  | { type: 'ACTION'; data: AIAction; sequence: number }
  | { type: 'END'; sessionId: string };

export interface ProjectSnapshot {
  id: string;
  name: string;
  canvasJson: string;
  layers: Layer[];
  workProfile: WorkProfile;
  collaboratorName: string;
  updatedAt: string;
}
