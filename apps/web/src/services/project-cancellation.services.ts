import axiosInstance from '../api'

export type CancellationAction = 'ARCHIVE' | 'DELETE'

export async function getCancellationSummary(requestId: number) {
  const res = await axiosInstance.get(`/project-cancellation/summary/${requestId}`)
  return res.data
}

export async function requestCancellation(params: { requestId: number; reason: string; action: CancellationAction }) {
  const res = await axiosInstance.post('/project-cancellation/request', params)
  return res.data
}

export async function respondCancellation(params: { cancellationId: number; approved: boolean; responseReason?: string }) {
  const res = await axiosInstance.put('/project-cancellation/respond', params)
  return res.data
}

export async function getPendingCancellations() {
  const res = await axiosInstance.get('/project-cancellation/pending')
  return res.data
}

export async function getCancellationHistory(requestId: number) {
  const res = await axiosInstance.get(`/project-cancellation/history/${requestId}`)
  return res.data
}


