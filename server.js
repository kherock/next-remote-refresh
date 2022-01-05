const http = require('http')
const path = require('path')
const WebSocket = require('ws')
const chokidar = require('chokidar')

module.exports = function createServer ({ paths, ignored, signal }) {
  const server = http.createServer()
  const wss = new WebSocket.Server({ server })
  let sockets = []

  wss.on('connection', (ws) => {
    sockets.push(ws)
    ws.on('close', () => {
      sockets = sockets.filter((socket) => socket !== ws)
    })
  })

  server.listen(0, () =>
    console.log(
      `[remote-refresh] server is listening at port ${server.address().port}`,
    ),
  )

  const watcher = chokidar
    .watch(
      (Array.isArray(paths) ? paths : [paths]).map((filePath) =>
        path.resolve(process.cwd(), filePath),
      ),
      { ignored },
    )
    .on('change', (filePath) => {
      const baseName = path.basename(path.dirname(process.cwd()))
      const updatedPath = `${baseName}${filePath.split(baseName)[1]}`
      console.log(`[remote-refresh] ${path.basename(filePath)} updated`)
      sockets.map((socket) => socket.send(updatedPath))
    })

  if (signal) {
    signal.addEventListener('abort', () => {
      watcher.close()
      wss.close()
      server.close()
    })
  }

  return server.address().port
}
