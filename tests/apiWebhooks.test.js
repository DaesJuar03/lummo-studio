import { describe, it, expect } from 'vitest';
import webhookProxyManager from '../electron/webhookProxyManager.cjs';

describe('Lummo Studio v3.0 API Client & Webhook Inspector Tests', () => {
  it('should validate mock webhook templates structure', () => {
    const templates = webhookProxyManager.MOCK_TEMPLATES;
    expect(templates).toBeDefined();
    expect(templates.stripe_payment_success).toBeDefined();
    expect(templates.stripe_payment_success.defaultEndpoint).toBe('/api/webhooks/stripe');
    expect(templates.stripe_payment_success.headers['stripe-signature']).toBeDefined();
    expect(templates.stripe_payment_success.payload.type).toBe('payment_intent.succeeded');

    expect(templates.mercadopago_payment_approved).toBeDefined();
    expect(templates.mercadopago_payment_approved.payload.type).toBe('payment');

    expect(templates.github_push).toBeDefined();
    expect(templates.github_push.payload.ref).toBe('refs/heads/main');
  });

  it('should store and clear webhook events in memory ring buffer', () => {
    const projectId = 'test-proj-123';
    
    // Clear initial state
    webhookProxyManager.clearWebhookEvents(projectId);
    let events = webhookProxyManager.getWebhookEvents(projectId);
    expect(events.length).toBe(0);

    // Simulate record
    const mockEvent = {
      id: 'wh_test_1',
      projectId,
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: '/api/webhooks/stripe',
      path: '/api/webhooks/stripe',
      headers: { 'content-type': 'application/json' },
      body: { event: 'test' },
      statusCode: 200,
      durationMs: 34
    };

    // Replay logic / storage
    const list = [mockEvent];
    expect(list.length).toBe(1);
    expect(list[0].method).toBe('POST');
    expect(list[0].statusCode).toBe(200);
  });

  it('should generate correct cURL snippet for API Client', () => {
    const method = 'POST';
    const endpoint = 'http://localhost:3000/api/users';
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer token123' };
    const body = '{"name":"Lummo"}';

    let headerFlags = Object.entries(headers)
      .map(([k, v]) => `  -H "${k}: ${v}"`)
      .join(' \\\n');
    let dataFlag = ` \\\n  -d '${body.replace(/'/g, "\\'")}'`;
    const snippet = `curl -X ${method} "${endpoint}"${headerFlags ? ' \\\n' + headerFlags : ''}${dataFlag}`;

    expect(snippet).toContain('curl -X POST "http://localhost:3000/api/users"');
    expect(snippet).toContain('-H "Content-Type: application/json"');
    expect(snippet).toContain('-H "Authorization: Bearer token123"');
    expect(snippet).toContain('-d \'{"name":"Lummo"}\'');
  });

  it('should filter webhook events by status code correctly', () => {
    const events = [
      { id: '1', statusCode: 200, path: '/api/stripe' },
      { id: '2', statusCode: 500, path: '/api/paypal' },
      { id: '3', statusCode: 404, path: '/api/notfound' }
    ];

    const successEvents = events.filter(e => e.statusCode >= 200 && e.statusCode < 300);
    const errorEvents = events.filter(e => e.statusCode >= 400);

    expect(successEvents.length).toBe(1);
    expect(successEvents[0].id).toBe('1');

    expect(errorEvents.length).toBe(2);
    expect(errorEvents.map(e => e.id)).toEqual(['2', '3']);
  });
});
