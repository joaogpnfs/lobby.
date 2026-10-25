import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createDocumentSchema,
  documentListQuerySchema,
  type CreateDocumentInput,
  type DocumentDto,
  type DocumentListQuery,
  type DocumentUpload,
  type SignedUrl,
} from "@lobby/types";
import { z } from "zod";
import { RequirePermissions } from "../../common/decorators.js";
import { DocumentsService } from "./documents.service.js";

const idParam = z.uuid();

@ApiTags("documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions("documents:read")
  @ApiOperation({ summary: "Available documents the caller may see (HR: all, everyone else: their own)." })
  list(@Query({ schema: documentListQuerySchema }) query: DocumentListQuery) {
    return this.documents.list(query);
  }

  @Post("presigned-url")
  @RequirePermissions("documents:create")
  @ApiOperation({ summary: "Creates a pending document and a 10 min URL to PUT the file directly to S3." })
  create(@Body({ schema: createDocumentSchema }) body: CreateDocumentInput): Promise<DocumentUpload> {
    return this.documents.create(body);
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("documents:create")
  @ApiOperation({ summary: "Checks the uploaded object's size and type, then makes the document available." })
  confirm(@Param("id", { schema: idParam }) id: string): Promise<DocumentDto> {
    return this.documents.confirm(id);
  }

  @Get(":id/download-url")
  @RequirePermissions("documents:read")
  @ApiOperation({ summary: "Signed download URL, valid for 5 minutes." })
  downloadUrl(@Param("id", { schema: idParam }) id: string): Promise<SignedUrl> {
    return this.documents.downloadUrl(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("documents:delete")
  @ApiOperation({ summary: "Deletes the file from storage; the metadata stays for the audit trail." })
  remove(@Param("id", { schema: idParam }) id: string): Promise<null> {
    return this.documents.remove(id);
  }
}
