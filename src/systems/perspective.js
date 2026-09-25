import { FORMS } from '../content/forms.js';
import { state } from '../core/state.js';

export const PERSPECTIVES = Object.freeze({
  ground: { zoom: 1, sense: 'ground' },
  sky: { zoom: 0.8, sense: 'sky' },
  water: { zoom: 1.08, sense: 'water' },
  soil: { zoom: 1.22, sense: 'soil' },
  night: { zoom: 0.9, sense: 'night' },
  small: { zoom: 1.16, sense: 'small' },
  scent: { zoom: 1.04, sense: 'scent' },
});

export function perspectiveFor(formId = state.formId) {
  const form = FORMS.find(entry => entry.id === formId) || FORMS[0];
  const a = form.abilities || {};
  const kind = form.waterBound ? 'water' : a.burrow ? 'soil'
    : a.nightVision || a.echo ? 'night' : a.flying ? 'sky'
      : a.small ? 'small' : form.scent ? 'scent' : 'ground';
  return PERSPECTIVES[kind];
}
