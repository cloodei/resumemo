import cors from "@elysiajs/cors";
import { logger } from "@rasla/logify";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { eq, and, desc } from "drizzle-orm";

import { db } from "./lib/db";
import { auth } from "./lib/auth";
import * as schema from "@shared/schemas";
import { generateStorageKey, generateUploadUrl, generateDownloadUrl, deleteFile } from "./lib/storage";

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
  
  // ============== FILE UPLOAD ROUTES ==============
  
  // Request presigned URLs for file uploads
  .post("/api/uploads/request", async ({ user, body }) => {
    const { files } = body;
    
    const uploadRequests = await Promise.all(
      files.map(async (file) => {
        const storageKey = generateStorageKey(user.id, file.name);
        
        // Create DB record first
        const [fileRecord] = await db.insert(schema.resumeFile)
          .values({
            userId: user.id,
            originalName: file.name,
            fileName: storageKey.split("/").pop()!,
            mimeType: file.mimeType,
            size: file.size,
            storageKey,
            status: "pending",
            progress: 0,
          })
          .returning();
        
        // Generate presigned URL for direct upload
        const uploadUrl = await generateUploadUrl(storageKey, file.mimeType);
        
        return {
          id: fileRecord.id,
          originalName: file.name,
          uploadUrl,
          storageKey,
        };
      })
    );
    
    return { uploads: uploadRequests };
  }, {
    auth: true,
    body: t.Object({
      files: t.Array(t.Object({
        name: t.String(),
        size: t.Number(),
        mimeType: t.String(),
      })),
    }),
  })
  
  // Mark upload as started
  .patch("/api/uploads/:id/start", async ({ user, params }) => {
    await db.update(schema.resumeFile)
      .set({
        status: "uploading",
        uploadStartedAt: new Date(),
      })
      .where(and(
        eq(schema.resumeFile.id, params.id),
        eq(schema.resumeFile.userId, user.id)
      ));
    
    return { status: "ok" };
  }, { auth: true })
  
  // Update upload progress
  .patch("/api/uploads/:id/progress", async ({ user, params, body }) => {
    const { progress } = body as { progress: number };
    
    await db.update(schema.resumeFile)
      .set({ progress })
      .where(and(
        eq(schema.resumeFile.id, params.id),
        eq(schema.resumeFile.userId, user.id)
      ));
    
    return { status: "ok" };
  }, {
    auth: true,
    body: t.Object({
      progress: t.Number({ minimum: 0, maximum: 100 }),
    }),
  })
  
  // Mark upload as completed
  .patch("/api/uploads/:id/complete", async ({ user, params }) => {
    await db.update(schema.resumeFile)
      .set({
        status: "uploaded",
        progress: 100,
        uploadCompletedAt: new Date(),
      })
      .where(and(
        eq(schema.resumeFile.id, params.id),
        eq(schema.resumeFile.userId, user.id)
      ));
    
    return { status: "ok" };
  }, { auth: true })
  
  // Mark upload as failed
  .patch("/api/uploads/:id/fail", async ({ user, params, body }) => {
    const { error } = body as { error: string };
    
    await db.update(schema.resumeFile)
      .set({
        status: "error",
        errorMessage: error,
      })
      .where(and(
        eq(schema.resumeFile.id, params.id),
        eq(schema.resumeFile.userId, user.id)
      ));
    
    return { status: "ok" };
  }, {
    auth: true,
    body: t.Object({
      error: t.String(),
    }),
  })
  
  // Get user's uploaded files
  .get("/api/uploads", async ({ user }) => {
    const files = await db.select()
      .from(schema.resumeFile)
      .where(eq(schema.resumeFile.userId, user.id))
      .orderBy(desc(schema.resumeFile.createdAt));
    
    return { files };
  }, { auth: true })
  
  // Delete an uploaded file
  .delete("/api/uploads/:id", async ({ user, params }) => {
    const [file] = await db.select()
      .from(schema.resumeFile)
      .where(and(
        eq(schema.resumeFile.id, params.id),
        eq(schema.resumeFile.userId, user.id)
      ));
    
    if (!file) {
      return { status: "error", message: "File not found" };
    }
    
    // Delete from R2
    try {
      await deleteFile(file.storageKey);
    } catch (err) {
      console.error("Failed to delete from R2:", err);
      // Continue to delete from DB anyway
    }
    
    // Delete from DB
    await db.delete(schema.resumeFile)
      .where(eq(schema.resumeFile.id, params.id));
    
    return { status: "ok" };
  }, { auth: true })
  
  // ============== PROFILING SESSION ROUTES ==============
  
  // Create a new profiling session (draft state)
  .post("/api/profiling", async ({ user, body }) => {
    const { name, jobDescription, jobTitle, fileIds } = body as { 
      name?: string; 
      jobDescription: string; 
      jobTitle?: string;
      fileIds: string[];
    };
    
    // Verify all files belong to user
    const userFiles = await db.select()
      .from(schema.resumeFile)
      .where(and(
        eq(schema.resumeFile.userId, user.id),
        eq(schema.resumeFile.status, "uploaded")
      ));
    
    const validFileIds = new Set(userFiles.map(f => f.id));
    const invalidFiles = fileIds.filter(id => !validFileIds.has(id));
    
    if (invalidFiles.length > 0) {
      return { status: "error", message: "Some files are invalid or not uploaded" };
    }
    
    // Create session
    const [session] = await db.insert(schema.profilingSession)
      .values({
        userId: user.id,
        name,
        jobDescription,
        jobTitle,
        status: "ready",
        totalFiles: fileIds.length,
      })
      .returning();
    
    // Associate files with session
    await db.insert(schema.profilingSessionFile)
      .values(fileIds.map(fileId => ({
        sessionId: session.id,
        fileId,
      })));
    
    return { session };
  }, {
    auth: true,
    body: t.Object({
      name: t.Optional(t.String()),
      jobDescription: t.String(),
      jobTitle: t.Optional(t.String()),
      fileIds: t.Array(t.String()),
    }),
  })
  
  // Start profiling (transition from ready -> profiling)
  .post("/api/profiling/:id/start", async ({ user, params }) => {
    const [session] = await db.select()
      .from(schema.profilingSession)
      .where(and(
        eq(schema.profilingSession.id, params.id),
        eq(schema.profilingSession.userId, user.id)
      ));
    
    if (!session) {
      return { status: "error", message: "Session not found" };
    }
    
    if (session.status !== "ready" && session.status !== "draft") {
      return { status: "error", message: "Session cannot be started" };
    }
    
    await db.update(schema.profilingSession)
      .set({
        status: "profiling",
        startedAt: new Date(),
      })
      .where(eq(schema.profilingSession.id, params.id));
    
    // TODO: Trigger actual profiling service here
    
    return { status: "ok", message: "Profiling started" };
  }, { auth: true })
  
  // Get user's profiling sessions
  .get("/api/profiling", async ({ user }) => {
    const sessions = await db.select()
      .from(schema.profilingSession)
      .where(eq(schema.profilingSession.userId, user.id))
      .orderBy(desc(schema.profilingSession.createdAt));
    
    return { sessions };
  }, { auth: true })
  
  // Get specific profiling session with files
  .get("/api/profiling/:id", async ({ user, params }) => {
    const [session] = await db.select()
      .from(schema.profilingSession)
      .where(and(
        eq(schema.profilingSession.id, params.id),
        eq(schema.profilingSession.userId, user.id)
      ));
    
    if (!session) {
      return { status: "error", message: "Session not found" };
    }
    
    // Get associated files with details
    const filesWithDetails = await db.select({
      sessionFile: schema.profilingSessionFile,
      file: schema.resumeFile,
    })
      .from(schema.profilingSessionFile)
      .innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
      .where(eq(schema.profilingSessionFile.sessionId, params.id))
      .orderBy(schema.profilingSessionFile.rank);
    
    return { 
      session,
      files: filesWithDetails.map(({ sessionFile, file }) => ({
        ...file,
        score: sessionFile.score,
        rank: sessionFile.rank,
        alignmentNotes: sessionFile.alignmentNotes,
      })),
    };
  }, { auth: true })
  
  .listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
