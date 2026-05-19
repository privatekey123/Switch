const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('switchApi', {
  listSources: () => ipcRenderer.invoke('sources:list'),
  openProgramWindow: () => ipcRenderer.invoke('program:open'),
  pushProgramStream: (streamId) => ipcRenderer.send('program:stream-updated', streamId),
  onProgramApplyStream: (handler) => ipcRenderer.on('program:apply-stream', (_evt, streamId) => handler(streamId))
});
