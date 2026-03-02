// Use global to ensure singleton behavior even if module is loaded twice
if (!global.notificationClients) {
  global.notificationClients = [];
}

/**
 * Handle SSE connection for admin notifications
 */
export const subscribeAdmin = (req, res) => {
  console.log(`[SSE] New subscription request. Current clients: ${global.notificationClients.length}`);
  
  // Clear any existing compression or buffer headers
  res.removeHeader('X-Powered-By');
  
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    'Content-Encoding': 'none'
  };
  res.writeHead(200, headers);
  if (res.flush) res.flush();
  else if (res.flushHeaders) res.flushHeaders(); 

  const clientId = Date.now();
  const newClient = { id: clientId, res };

  global.notificationClients.push(newClient);
  console.log(`[SSE] Client ${clientId} registered. Total: ${global.notificationClients.length}`);

  // Send initial message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: '✅ Admin Notification System Active' })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT' })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    console.log(`[SSE] Client ${clientId} disconnected.`);
    clearInterval(heartbeat);
    global.notificationClients = global.notificationClients.filter(c => c.id !== clientId);
  });
};

/**
 * Broadcast notification to all connected admin clients
 */
export const broadcastNotification = (data) => {
  const clients = global.notificationClients || [];
  console.log(`[SSE] Broadcasting ${data.type} to ${clients.length} clients`);
  clients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error(`[SSE] Broadcast failed for ${client.id}:`, err.message);
    }
  });
};
