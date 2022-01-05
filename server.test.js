const { EventEmitter } = require('events')
const { mkdtemp, rm, writeFile } = require('fs/promises')
const { tmpdir } = require('os')
const path = require('path')

const createServer = require('./server')

describe('server', () => {
  let tmpd
  let wsServerMock
  let socketMock
  let abortController

  beforeEach(async () => {
    tmpd = await mkdtemp(path.join(tmpdir(), 'next-remote-refresh_'))
    wsServerMock = Object.assign(new EventEmitter(), {
      close: jest.fn(),
    })
    socketMock = Object.assign(new EventEmitter(), {
      send: jest.fn(),
    })
    jest.spyOn(require('http'), 'createServer').mockReturnValue(
      Object.assign(new EventEmitter(), {
        address: jest.fn().mockReturnValue({ port: 2000 }),
        close: jest.fn(),
        listen: jest.fn(),
      }),
    )
    jest.spyOn(require('ws'), 'Server').mockReturnValue(wsServerMock)
    abortController = new AbortController()
  })

  afterEach(async () => {
    abortController.abort()
    jest.restoreAllMocks()
    await rm(tmpd, { recursive: true })
  })

  it('watches a directory for changes', async () => {
    createServer({ paths: tmpd, signal: abortController.signal })
    wsServerMock.emit('connection', socketMock)

    // TODO: make createServer async
    await new Promise(resolve => setTimeout(resolve, 100))
    await writeFile(path.join(tmpd, 'foo.txt'), '')
    await writeFile(path.join(tmpd, 'foo.txt'), 'foobar')

    // TODO: server sends `undefined` when a file changes outside of the working directory
    expect(socketMock.send).toHaveBeenCalledWith(expect.stringContaining('undefined'))
  })
})
