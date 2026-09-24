export type TabCapture = {
  stopAndDownload(): Promise<{ bytes: number; audioTracks: number }>
}

export async function startTabCapture(onFailure: (error: Error) => void): Promise<TabCapture> {
  if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('分頁錄製 API 不可用')
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true,
    preferCurrentTab: true,
  } as DisplayMediaStreamOptions & { preferCurrentTab: boolean })
  const audioTracks = stream.getAudioTracks().length
  if (audioTracks === 0) {
    stream.getTracks().forEach((track) => track.stop())
    throw new Error('沒有分頁音軌；請選目前分頁並開啟分享分頁音訊')
  }
  const format = typeof MediaRecorder.isTypeSupported === 'function'
    ? ['video/webm;codecs=vp8,opus', 'video/webm'].find((mime) => MediaRecorder.isTypeSupported(mime))
    : 'video/webm'
  if (!format) {
    stream.getTracks().forEach((track) => track.stop())
    throw new Error('此瀏覽器無法錄製 WebM')
  }
  const chunks: BlobPart[] = []
  let recorder: MediaRecorder
  try { recorder = new MediaRecorder(stream, { mimeType: format }) }
  catch (error) {
    stream.getTracks().forEach((track) => track.stop())
    throw error
  }
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
  let failure: Error | null = null
  let rejectDownload: ((error: Error) => void) | null = null
  let stopping = false
  recorder.onerror = () => {
    failure = new Error('WebM 錄製失敗')
    stream.getTracks().forEach((track) => track.stop())
    if (rejectDownload) rejectDownload(failure)
    else if (!stopping) onFailure(failure)
  }
  try { recorder.start() }
  catch (error) {
    stream.getTracks().forEach((track) => track.stop())
    throw error
  }

  return {
    stopAndDownload: () => new Promise((resolve, reject) => {
      if (failure) { reject(failure); return }
      rejectDownload = reject
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        if (failure) { reject(failure); return }
        const file = new Blob(chunks, { type: format })
        if (file.size === 0) { reject(new Error('WebM 檔案為空')); return }
        const url = URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = 'output-capture.webm'
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        resolve({ bytes: file.size, audioTracks })
      }
      if (recorder.state === 'inactive') {
        stream.getTracks().forEach((track) => track.stop())
        reject(new Error('分頁分享已結束，請重新錄製'))
      } else {
        stopping = true
        recorder.stop()
      }
    }),
  }
}
