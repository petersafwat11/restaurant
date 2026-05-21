import { FormField } from '@repo/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('FormField (extended with prefix/suffix/size)', () => {
  it('injects an id into the single child and ties the label to it', () => {
    render(
      <FormField id="email" label="Email">
        <input data-testid="el" type="email" />
      </FormField>,
    );
    const input = screen.getByTestId('el');
    expect(input.getAttribute('id')).toBe('email');
    const label = screen.getByText('Email');
    // The label should reference the same id via htmlFor.
    expect(label.getAttribute('for')).toBe('email');
  });

  it('marks the input aria-invalid and shows error text when error is set', () => {
    render(
      <FormField id="email" label="Email" error="Bad email">
        <input data-testid="el" />
      </FormField>,
    );
    const input = screen.getByTestId('el');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Bad email')).toBeTruthy();
  });

  it('wires aria-describedby to a helper or error region', () => {
    render(
      <FormField id="email" label="Email" helper="We won't share it">
        <input data-testid="el" />
      </FormField>,
    );
    const input = screen.getByTestId('el');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy).toContain('email');
  });

  it('renders the required indicator when required', () => {
    render(
      <FormField id="email" label="Email" required>
        <input />
      </FormField>,
    );
    // Look for an asterisk somewhere near the label.
    expect(screen.getByText(/\*/)).toBeTruthy();
  });

  it('renders prefix and suffix slots when provided', () => {
    render(
      <FormField id="phone" label="Phone" prefix={<span>+48</span>} suffix={<span>✓</span>}>
        <input />
      </FormField>,
    );
    expect(screen.getByText('+48')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });
});
