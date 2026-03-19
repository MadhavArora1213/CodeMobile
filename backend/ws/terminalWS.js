const pty = require('node-pty');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const sessions = new Map();

const handleTerminalWS = (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const sessionId = urlParams.get('sessionId') || uuidv4();
  
  console.log(`Terminal session started: ${sessionId}`);

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || process.cwd(),
    env: process.env
  });

  sessions.set(sessionId, ptyProcess);

  // Send READY signal
  ws.send(JSON.stringify({ type: 'SESSION_READY', sessionId }));

  ptyProcess.on('data', (data) => {
    ws.send(JSON.stringify({ type: 'TERMINAL_OUTPUT', data: data }));
  });

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      switch (parsed.type) {
        case 'TERMINAL_INPUT':
          ptyProcess.write(parsed.data);
          break;
        case 'TERMINAL_RESIZE':
          ptyProcess.resize(parsed.cols, parsed.rows);
          break;
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        case 'KILL_SESSION':
          ptyProcess.kill();
          break;
      }
    } catch (e) {
      // Fallback for raw input
      ptyProcess.write(msg.toString());
    }
  });

  ws.on('close', () => {
    console.log(`Terminal session closed: ${sessionId}`);
    ptyProcess.kill();
    sessions.delete(sessionId);
  });
};

module.exports = { handleTerminalWS };
