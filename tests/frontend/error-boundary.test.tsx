// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders its children normally', () => {
    render(
      <ErrorBoundary>
        <span>Contenido estable</span>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Contenido estable')).toBeInTheDocument();
  });

  it('shows the recovery UI and handles retry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const BrokenChild = () => {
      throw new Error('fallo de prueba');
    };

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo salió mal en este componente.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByText('Algo salió mal en este componente.')).toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
