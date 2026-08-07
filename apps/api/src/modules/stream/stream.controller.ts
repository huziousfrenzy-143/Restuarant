import { Response } from 'express';
import { TenantRequest } from '../../middlewares/tenant.middleware';
import { eventBus } from '../../utils/event-bus';

export class StreamController {
  static async streamUpdates(req: TenantRequest, res: Response) {
    const orgId = req.params.orgId;
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable NGINX buffering
    
    // Disable Express compression middleware for this request
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);
    
    // Flush headers to establish the connection immediately
    res.flushHeaders();

    // Send an initial connected ping
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    if (typeof (res as any).flush === 'function') (res as any).flush();

    const listener = (data: { type: string }) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
    };

    // Listen to events for this organization
    eventBus.on(`updated:${orgId}`, listener);

    // Clean up when the client disconnects
    req.on('close', () => {
      eventBus.off(`updated:${orgId}`, listener);
    });
  }
}
