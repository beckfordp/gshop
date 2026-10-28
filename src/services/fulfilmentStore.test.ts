import { afterEach, describe, expect, it } from 'vitest';
import {
  FulfilmentTransitionError,
  dispatchOrder,
  getFulfilmentQueue,
  markPacked,
  reportProblem,
  resetFulfilmentQueue,
  startPicking,
} from './fulfilmentStore';

describe('fulfilmentStore', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('seeds one sample order per state', () => {
    const states = new Set(getFulfilmentQueue().map((order) => order.state));

    expect(states).toEqual(
      new Set(['PENDING', 'PICKING', 'PACKED', 'DISPATCHED', 'DISPATCH_FAILED']),
    );
  });

  it('drives PENDING -> PICKING -> PACKED -> DISPATCHED and persists each step', () => {
    startPicking('FUL-1001');
    expect(
      getFulfilmentQueue().find((order) => order.orderId === 'FUL-1001')?.state,
    ).toBe('PICKING');

    markPacked('FUL-1001');
    dispatchOrder('FUL-1001', ' GLN-1 ', 'DHL Express');

    const order = getFulfilmentQueue().find(
      (candidate) => candidate.orderId === 'FUL-1001',
    );
    expect(order?.state).toBe('DISPATCHED');
    expect(order?.trackingNo).toBe('GLN-1');
    expect(order?.carrier).toBe('DHL Express');
  });

  it('reports a problem from any non-terminal state', () => {
    reportProblem('FUL-1001', 'Pallet dropped');

    const order = getFulfilmentQueue().find(
      (candidate) => candidate.orderId === 'FUL-1001',
    );
    expect(order?.state).toBe('DISPATCH_FAILED');
    expect(order?.failureReason).toBe('Pallet dropped');
  });

  it('rejects transitions from terminal states', () => {
    expect(() => startPicking('FUL-1004')).toThrow(FulfilmentTransitionError);
    expect(() => reportProblem('FUL-1005', 'too late')).toThrow(
      FulfilmentTransitionError,
    );
  });

  it('rejects an invalid transition order', () => {
    expect(() => markPacked('FUL-1001')).toThrow(FulfilmentTransitionError);
  });

  it('requires tracking number, carrier and failure reason', () => {
    expect(() => dispatchOrder('FUL-1003', ' ', 'DHL')).toThrow(
      'Tracking number and carrier are required to dispatch',
    );
    expect(() => dispatchOrder('FUL-1003', 'GLN-2', ' ')).toThrow(
      'Tracking number and carrier are required to dispatch',
    );
    expect(() => reportProblem('FUL-1001', '   ')).toThrow(
      'A reason is required',
    );
  });

  it('reset restores the seeded queue', () => {
    startPicking('FUL-1001');
    resetFulfilmentQueue();

    expect(
      getFulfilmentQueue().find((order) => order.orderId === 'FUL-1001')?.state,
    ).toBe('PENDING');
  });

  it('falls back to the seed for corrupt storage', () => {
    localStorage.setItem('gshop:fulfilmentQueue', '{not json');

    expect(getFulfilmentQueue()).toHaveLength(5);
  });
});
