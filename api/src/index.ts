import cors from "@elysiajs/cors";
import { logger } from "@rasla/logify";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { eq, and, desc, inArray } from "drizzle-orm";

import { db } from "./lib/db";
import { auth } from "./lib/auth";
import * as schema from "@shared/schemas";
import { generateStorageKey, generateUploadUrl, deleteFile } from "./lib/storage";

const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });

        if (!session)
          return status(401, { message: "Unauthorized" });

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

const app = new Elysia({ precompile: true })
  .use(
    cors({
      // origin: process.env.FRONTEND_URL ?? "http://localhost:5000",
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(logger())
  .use(openapi())
  .use(betterAuth)
  .get("/", () => ({ status: "ok" }))
  .get(
    "/api/me",
    ({ user, session }) => ({
      user,
      session,
    }),
    { auth: true },
  )
  .get("/api/test", async () => {
    const [users, sessions, accounts, verifications] = await Promise.all([
      db.select().from(schema.user),
      db.select().from(schema.session),
      db.select().from(schema.account),
      db.select().from(schema.verification),
    ]);
    return { users, sessions, accounts, verifications };
  })
  .get("/api/clear", async () => {
    /**
     * TODO: Remove this endpoint
     * ONLY FOR DEVELOPMENT
     */
    await Promise.all([
      db.delete(schema.user),
      db.delete(schema.session),
      db.delete(schema.account),
      db.delete(schema.verification),
    ]);
    return { status: "ok" };
  })

  /**
   * Create a new profiling session and get presigned upload URLs.
   *
   * This is the single entry point for the upload flow. It:
   * 1. Deduplicates files by fingerprint + size + mimeType against existing user files
   * 2. Creates the profiling session (status: "uploading")
   * 3. Creates new file records for files that don't already exist
   * 4. Creates join table entries for all files (new + reused)
   * 5. Returns presigned URLs only for files that need uploading
   */
  .post("/api/sessions", async ({ user, body }) => {
    const { name, jobTitle, jobDescription, files } = body;
    
    // --- Deduplication: find existing files by fingerprint ---
    const fingerprints = files.map(f => f.fingerprint);
    
    let existingFiles: (typeof schema.resumeFile.$inferSelect)[] = [];
    if (fingerprints.length > 0) {
      existingFiles = await db.select()
        .from(schema.resumeFile)
        .where(and(
          eq(schema.resumeFile.userId, user.id),
          inArray(schema.resumeFile.fingerprint, fingerprints)
        ));
    }
    
    // Build a lookup: fingerprint+size+mimeType -> existing file record
    const existingLookup = new Map(
      existingFiles.map(f => [
        `${f.fingerprint}:${f.size}:${f.mimeType}`,
        f,
      ])
    );
    
    // Partition incoming files into reused vs new
    const reusedFiles: { id: string; originalName: string }[] = [];
    const newFileEntries: {
      meta: typeof files[number];
      storageKey: string;
    }[] = [];
    
    for (const file of files) {
      const key = `${file.fingerprint}:${file.size}:${file.mimeType}`;
      const existing = existingLookup.get(key);
      
      if (existing) {
        reusedFiles.push({ id: existing.id, originalName: existing.originalName });
      } else {
        const storageKey = generateStorageKey(user.id, file.name);
        newFileEntries.push({ meta: file, storageKey });
      }
    }
    
    // --- Create new file records ---
    let insertedFiles: (typeof schema.resumeFile.$inferSelect)[] = [];
    if (newFileEntries.length > 0) {
      insertedFiles = await db.insert(schema.resumeFile)
        .values(newFileEntries.map(({ meta, storageKey }) => ({
          userId: user.id,
          originalName: meta.name,
          mimeType: meta.mimeType,
          size: BigInt(meta.size),
          storageKey,
          fingerprint: meta.fingerprint,
        })))
        .returning();
    }
    
    // --- Generate presigned URLs for new files ---
    const newUploads = await Promise.all(
      insertedFiles.map(async (file, i) => {
        const uploadUrl = await generateUploadUrl(
          newFileEntries[i].storageKey,
          file.mimeType,
        );
        return {
          id: file.id,
          originalName: file.originalName,
          uploadUrl,
          storageKey: file.storageKey,
        };
      })
    );
    
    const totalFiles = reusedFiles.length + insertedFiles.length;
    
    // --- Create the profiling session ---
    const [session] = await db.insert(schema.profilingSession)
      .values({
        userId: user.id,
        name,
        jobDescription,
        jobTitle,
        status: "uploading",
        totalFiles,
      })
      .returning();
    
    // --- Create join table entries for ALL files (reused + new) ---
    const allFileIds = [
      ...reusedFiles.map(f => f.id),
      ...insertedFiles.map(f => f.id),
    ];
    
    if (allFileIds.length > 0) {
      await db.insert(schema.profilingSessionFile)
        .values(allFileIds.map(fileId => ({
          sessionId: session.id,
          fileId,
        })));
    }
    
    return {
      session,
      newUploads,
      reusedFiles,
    };
  }, {
    auth: true,
    body: t.Object({
      name: t.String({ minLength: 1 }),
      jobDescription: t.String({ minLength: 1 }),
      jobTitle: t.Optional(t.String()),
      files: t.Array(t.Object({
        name: t.String(),
        size: t.Number(),
        mimeType: t.String(),
        fingerprint: t.String(),
      })),
    }),
  })
  
  /**
   * Confirm upload completion for a session.
   *
   * The client sends the final list of successfully uploaded file IDs.
   * Any files that were created but not confirmed are cleaned up (removed
   * from R2 + DB). The session's totalFiles count is updated to reflect
   * the actual confirmed set, and the session transitions to "ready".
   *
   * If zero files were confirmed, the session transitions to "failed".
   */
  .post("/api/sessions/:id/confirm", async ({ user, params, body }) => {
    const { uploadedFileIds } = body;
    
    // Verify session belongs to user and is in "uploading" state
    const [session] = await db.select()
      .from(schema.profilingSession)
      .where(and(
        eq(schema.profilingSession.id, params.id),
        eq(schema.profilingSession.userId, user.id),
      ));
    
    if (!session) {
      return { status: "error", message: "Session not found" };
    }
    
    if (session.status !== "uploading") {
      return { status: "error", message: "Session is not in uploading state" };
    }
    
    // Get all files associated with this session
    const sessionFiles = await db.select({
      joinId: schema.profilingSessionFile.id,
      fileId: schema.profilingSessionFile.fileId,
    })
      .from(schema.profilingSessionFile)
      .where(eq(schema.profilingSessionFile.sessionId, params.id));
    
    const confirmedSet = new Set(uploadedFileIds);
    const failedJoinIds: string[] = [];
    const failedFileIds: string[] = [];
    
    for (const sf of sessionFiles) {
      if (!confirmedSet.has(sf.fileId)) {
        failedJoinIds.push(sf.joinId);
        failedFileIds.push(sf.fileId);
      }
    }
    
    // Remove join records for files that weren't confirmed
    if (failedJoinIds.length > 0) {
      await db.delete(schema.profilingSessionFile)
        .where(inArray(schema.profilingSessionFile.id, failedJoinIds));
    }
    
    // Clean up failed files from R2 and DB — but only if they aren't
    // referenced by other sessions (they could be reused files)
    for (const fileId of failedFileIds) {
      const otherRefs = await db.select({ id: schema.profilingSessionFile.id })
        .from(schema.profilingSessionFile)
        .where(eq(schema.profilingSessionFile.fileId, fileId));
      
      if (otherRefs.length === 0) {
        // No other session uses this file — safe to delete
        const [file] = await db.select()
          .from(schema.resumeFile)
          .where(eq(schema.resumeFile.id, fileId));
        
        if (file) {
          try { await deleteFile(file.storageKey); } catch { /* best-effort */ }
          await db.delete(schema.resumeFile)
            .where(eq(schema.resumeFile.id, fileId));
        }
      }
    }
    
    const confirmedCount = uploadedFileIds.length;
    
    if (confirmedCount === 0) {
      // No files made it — mark session as failed
      await db.update(schema.profilingSession)
        .set({
          status: "failed",
          totalFiles: 0,
          errorMessage: "No files were uploaded successfully",
        })
        .where(eq(schema.profilingSession.id, params.id));
      
      return { status: "failed", message: "No files uploaded", confirmedCount: 0 };
    }
    
    // Update session with final file count and transition to "ready"
    await db.update(schema.profilingSession)
      .set({
        status: "ready",
        totalFiles: confirmedCount,
      })
      .where(eq(schema.profilingSession.id, params.id));
    
    return { status: "ok", confirmedCount };
  }, {
    auth: true,
    body: t.Object({
      uploadedFileIds: t.Array(t.String()),
    }),
  })
  
  /**
   * Start profiling (transition ready -> processing).
   * The actual AI pipeline is not yet implemented.
   */
  .post("/api/sessions/:id/start", async ({ user, params }) => {
    const [session] = await db.select()
      .from(schema.profilingSession)
      .where(and(
        eq(schema.profilingSession.id, params.id),
        eq(schema.profilingSession.userId, user.id)
      ));
    
    if (!session) {
      return { status: "error", message: "Session not found" };
    }
    
    if (session.status !== "ready") {
      return { status: "error", message: "Session is not ready to start" };
    }
    
    await db.update(schema.profilingSession)
      .set({ status: "processing" })
      .where(eq(schema.profilingSession.id, params.id));
    
    // TODO: Trigger actual profiling service here
    
    return { status: "ok", message: "Profiling started" };
  }, { auth: true })
  
  /**
   * List all profiling sessions for the authenticated user.
   */
  .get("/api/sessions", async ({ user }) => {
    const sessions = await db.select()
      .from(schema.profilingSession)
      .where(eq(schema.profilingSession.userId, user.id))
      .orderBy(desc(schema.profilingSession.createdAt));
    
    return { sessions };
  }, { auth: true })
  
  /**
   * Get a specific profiling session with its associated files.
   */
  .get("/api/sessions/:id", async ({ user, params }) => {
    const [session] = await db.select()
      .from(schema.profilingSession)
      .where(and(
        eq(schema.profilingSession.id, params.id),
        eq(schema.profilingSession.userId, user.id)
      ));
    
    if (!session) {
      return { status: "error", message: "Session not found" };
    }
    
    // Get associated files
    const filesWithDetails = await db.select({
      sessionFile: schema.profilingSessionFile,
      file: schema.resumeFile,
    })
      .from(schema.profilingSessionFile)
      .innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
      .where(eq(schema.profilingSessionFile.sessionId, params.id));
    
    return { 
      session,
      files: filesWithDetails.map(({ file }) => ({
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      })),
    };
  }, { auth: true })
  
  // ============== FILE ROUTES ==============
  
  /**
   * List all files for the authenticated user (for reuse UI in future).
   */
  .get("/api/files", async ({ user }) => {
    const files = await db.select()
      .from(schema.resumeFile)
      .where(eq(schema.resumeFile.userId, user.id))
      .orderBy(desc(schema.resumeFile.createdAt));
    
    return { files };
  }, { auth: true })
  
  /**
   * Delete a file from R2 and DB.
   * Only allowed if the file is not referenced by any session.
   */
  .delete("/api/files/:id", async ({ user, params }) => {
    const [file] = await db.select()
      .from(schema.resumeFile)
      .where(and(
        eq(schema.resumeFile.id, params.id),
        eq(schema.resumeFile.userId, user.id)
      ));
    
    if (!file) {
      return { status: "error", message: "File not found" };
    }
    
    // Check if any session references this file
    const refs = await db.select({ id: schema.profilingSessionFile.id })
      .from(schema.profilingSessionFile)
      .where(eq(schema.profilingSessionFile.fileId, params.id));
    
    if (refs.length > 0) {
      return { status: "error", message: "File is used by one or more sessions" };
    }
    
    try {
      await deleteFile(file.storageKey);
    } catch {
      // Best-effort R2 deletion
    }
    
    await db.delete(schema.resumeFile)
      .where(eq(schema.resumeFile.id, params.id));
    
    return { status: "ok" };
  }, { auth: true })
  
  .listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
