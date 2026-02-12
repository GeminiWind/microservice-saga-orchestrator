import { SagaContext, SagaRecord, SagaStatus, SagaStepStatus } from "@app/common";

export class SagaStore {
  private readonly records = new Map<string, SagaRecord>();

  create(sagaId: string, context: SagaContext, status: SagaStatus = "PENDING_ORDER"): SagaRecord {
    const now = new Date().toISOString();
    const record: SagaRecord = {
      sagaId,
      status,
      createdAt: now,
      updatedAt: now,
      steps: [],
      context
    };
    this.records.set(sagaId, record);
    return record;
  }

  get(sagaId: string): SagaRecord | undefined {
    return this.records.get(sagaId);
  }

  updateStatus(sagaId: string, status: SagaStatus): SagaRecord {
    const record = this.mustGet(sagaId);
    record.status = status;
    record.updatedAt = new Date().toISOString();
    return record;
  }

  setContextValue<T extends keyof SagaContext>(sagaId: string, key: T, value: SagaContext[T]): SagaRecord {
    const record = this.mustGet(sagaId);
    record.context[key] = value;
    record.updatedAt = new Date().toISOString();
    return record;
  }

  addStep(sagaId: string, step: string, status: SagaStepStatus, details?: unknown, messageId?: string): SagaRecord {
    const record = this.mustGet(sagaId);
    record.steps.push({
      step,
      status,
      details,
      messageId,
      timestamp: new Date().toISOString()
    });
    record.updatedAt = new Date().toISOString();
    return record;
  }

  setError(sagaId: string, error: string): SagaRecord {
    const record = this.mustGet(sagaId);
    record.error = error;
    record.updatedAt = new Date().toISOString();
    return record;
  }

  private mustGet(sagaId: string): SagaRecord {
    const record = this.records.get(sagaId);
    if (!record) {
      throw new Error(`Saga ${sagaId} was not found`);
    }
    return record;
  }
}
