import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { env } from "../../env.js";
import { DocumentsService } from "../documents/documents.service.js";
import { VacationsService } from "../vacations/vacations.service.js";

const QUEUE = "maintenance";
const EVERY_MS = 60 * 60 * 1000;

@Injectable()
export class JobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger("Jobs");
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly documents: DocumentsService,
    private readonly vacations: VacationsService,
  ) {}

  async onApplicationBootstrap() {
    if (env.NODE_ENV === "test") return;
    const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };
    this.queue = new Queue(QUEUE, { connection });
    this.worker = new Worker(QUEUE, () => this.runMaintenance(), { connection });
    this.worker.on("failed", (_job, err) => this.logger.error(err));
    await this.queue
      .upsertJobScheduler("hourly", { every: EVERY_MS }, { name: "maintenance" })
      .catch((err: unknown) => this.logger.warn(`Job scheduler unavailable: ${String(err)}`));
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async runMaintenance() {
    const [purgedUploads, completedVacations] = await Promise.all([
      this.documents.purgeStaleUploads(),
      this.vacations.completeFinished(),
    ]);
    return { purgedUploads, completedVacations };
  }
}
