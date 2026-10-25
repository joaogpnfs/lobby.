import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module.js";
import { VacationsModule } from "../vacations/vacations.module.js";
import { JobsService } from "./jobs.service.js";

@Module({
  imports: [DocumentsModule, VacationsModule],
  providers: [JobsService],
})
export class JobsModule {}
