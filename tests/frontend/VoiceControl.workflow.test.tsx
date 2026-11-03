// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceControl } from '../../src/components/VoiceControl';
import type { AppCommand, Layer } from '../../src/types';

const layers: Layer[] = [
  { id: 'layer-ia', name: 'Capa Base IA', visible: true, locked: false, opacity: 1 },
];

function renderVoiceControl(overrides: Record<string, unknown> = {}) {
  const props = {
    onSendCommand: vi.fn(),
    commands: [] as AppCommand[],
    providers: [{ name: 'gemini', displayName: 'Gemini', models: ['gemini-pro'] }],
    selectedProvider: 'gemini',
    onProviderChange: vi.fn(),
    isProcessing: false,
    layers,
    activeLayerId: 'layer-ia',
    onAddLayer: vi.fn(),
    onRemoveLayer: vi.fn(),
    onToggleLayer: vi.fn(),
    onRenameLayer: vi.fn(),
    onToggleLockLayer: vi.fn(),
    onLayerOpacity: vi.fn(),
    onMoveLayer: vi.fn(),
    onSelectLayer: vi.fn(),
    accessibility: { highContrast: false, easyRead: false, largeUi: false, reduceMotion: false },
    onAccessibilityChange: vi.fn(),
    workProfile: 'artist' as const,
    onWorkProfileChange: vi.fn(),
    projectName: 'Proyecto VozArt',
    onProjectNameChange: vi.fn(),
    collaboratorName: 'Invitado',
    onCollaboratorNameChange: vi.fn(),
    projects: [],
    currentProjectId: null,
    autosaveStatus: 'Guardado',
    onNewProject: vi.fn(),
    onOpenProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onExportProject: vi.fn(),
    onImportProject: vi.fn(),
    onCopyShareUrl: vi.fn(),
    onClose: vi.fn(),
    onInspiration: vi.fn(),
    onRefineSelection: vi.fn(),
    canvasObjects: [],
    handTrackingActive: false,
    onToggleHandTracking: vi.fn(),
    roomId: null,
    collaborators: 0,
    onJoinRoom: vi.fn(),
    onLeaveRoom: vi.fn(),
    eyeTrackingActive: false,
    onToggleEyeTracking: vi.fn(),
    storyMode: false,
    onStoryCommand: vi.fn(),
    onExitStoryMode: vi.fn(),
    autoMode: true,
    onToggleAutoMode: vi.fn(),
    pendingActions: [],
    onConfirmAction: vi.fn(),
    onRejectAction: vi.fn(),
    ...overrides,
  };
  return render(<VoiceControl {...(props as any)} />);
}

describe('VoiceControl task-oriented workflow layout', () => {
  it('keeps the command entry before secondary collapsible groups (no scrolling past them)', () => {
    renderVoiceControl();
    const commandInput = screen.getByPlaceholderText('Comando manual...');
    const projectToggle = screen.getByRole('button', { name: /Proyecto/i });
    // command input must come earlier in the DOM than the Proyecto group toggle
    const position = commandInput.compareDocumentPosition(projectToggle);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('collapses the collaboration group by default and reveals it on toggle', async () => {
    const user = userEvent.setup();
    renderVoiceControl();
    expect(screen.queryByText('Crear sala compartida')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Colaboración/i }));
    expect(screen.getByText('Crear sala compartida')).toBeInTheDocument();
  });

  it('exposes accessible expandable section toggles', () => {
    renderVoiceControl();
    const projectToggle = screen.getByRole('button', { name: /Proyecto/i });
    expect(projectToggle).toHaveAttribute('aria-expanded');
  });

  it('renders successful INFO notices as information, not errors', () => {
    renderVoiceControl({
      commands: [{
        type: 'ERROR',
        data: { action: 'INFO', message: 'Servidor OK v1.5.0. 4 proveedores activos.' },
      }],
    });

    expect(screen.getAllByText(/Servidor OK v1\.5\.0\. 4 proveedores activos\./)).toHaveLength(2);
    expect(screen.getByText('Información')).toBeInTheDocument();
    expect(screen.queryByText('Error')).toBeNull();
  });
});
