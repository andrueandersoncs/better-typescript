type ExportJob = { id: string; format: "csv" | "json" }

interface ExportQueue {
  enqueue(job: ExportJob): Promise<void>
  cancel(jobId: string): Promise<void>
}

export class WorkerExportQueue implements ExportQueue {
  async enqueue(job: ExportJob) {
    await worker.send(job)
  }

  async cancel(jobId: string) {
    await worker.cancel(jobId)
  }
}

export class BatchExportQueue implements ExportQueue {
  async enqueue(job: ExportJob) {
    await batch.add(job)
  }

  async cancel(_jobId: string) {
    throw new Error("A scheduled batch cannot be individually cancelled")
  }
}

declare const worker: { send(job: ExportJob): Promise<void>; cancel(id: string): Promise<void> }
declare const batch: { add(job: ExportJob): Promise<void> }
