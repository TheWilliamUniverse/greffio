import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STATUTES_WORKFLOW_STATUSES,
  getStatutesWorkflowStatus,
  transitionStatutesWorkflow,
  canRequestStatutesSignature,
  canEditStatutes,
} from '../statutesWorkflow.js';

test('statutes workflow defaults to pending client review metadata', () => {
  const status = getStatutesWorkflowStatus({
    metadata: { statutesWorkflowStatus: 'pending_client_review' },
  });
  assert.equal(status, STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW);
});

test('client can submit review to ops', () => {
  const result = transitionStatutesWorkflow({
    currentStatus: STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW,
    action: 'submit_client_review',
    isOps: false,
  });
  assert.equal(result.ok, true);
  assert.equal(result.nextStatus, STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW);
});

test('ops validation unlocks signature', () => {
  const validated = transitionStatutesWorkflow({
    currentStatus: STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW,
    action: 'validate',
    isOps: true,
  });
  assert.equal(validated.ok, true);
  assert.equal(validated.nextStatus, STATUTES_WORKFLOW_STATUSES.VALIDATED);
  assert.equal(canRequestStatutesSignature({ metadata: { statutesWorkflowStatus: 'validated' } }), true);
});

test('signature remains blocked before validation', () => {
  assert.equal(
    canRequestStatutesSignature({ metadata: { statutesWorkflowStatus: 'pending_client_review' } }),
    false,
  );
});

test('client can edit statutes during review phases', () => {
  assert.equal(
    canEditStatutes({ metadata: { statutesWorkflowStatus: 'pending_client_review' } }),
    true,
  );
  assert.equal(
    canEditStatutes({ metadata: { statutesWorkflowStatus: 'validated' } }),
    false,
  );
  assert.equal(
    canEditStatutes({ metadata: { statutesWorkflowStatus: 'signed' } }),
    false,
  );
});
