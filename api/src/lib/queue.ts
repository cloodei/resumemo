/**
 * RabbitMQ publisher for dispatching pipeline jobs.
 *
 * Publishes Celery-compatible task messages to the profiling.jobs queue.
 * Uses amqplib with a persistent connection and channel.
 */

import { randomUUIDv7 } from "bun";
import amqplib, { type Connection, type ChannelModel, type Channel } from "amqplib";

const QUEUE_NAME = "profiling.jobs";
const CELERY_TASK_NAME = "pipeline.process_session";

let connection: Connection | null = null;
let channel: Channel | null = null;

async function getChannel() {
	if (channel) return channel;

	const url = process.env.CLOUDAMQP_URL ?? "amqp://resumemo:resumemo@localhost:5672//";

	const x = await amqplib.connect(url);
	channel = await x.createChannel();
	connection = x

	// Ensure the queue exists (durable = survives broker restart)
	await channel.assertQueue(QUEUE_NAME, { durable: true });

	console.log(`[RabbitMQ] Connected and queue "${QUEUE_NAME}" asserted`);

	// Handle connection errors
	connection.on("error", (err) => {
		console.error("[RabbitMQ] Connection error:", err.message);
		channel = null;
		connection = null;
	});

	connection.on("close", () => {
		console.warn("[RabbitMQ] Connection closed, will reconnect on next publish");
		channel = null;
		connection = null;
	});

	return channel;
}

export type PipelineJobPayload = {
	session_id: string;
	job_id: string;
	callback_url: string;
	callback_secret: string;
	job_description: string;
	job_title: string | null;
	pipeline_version: string;
	files: {
		file_id: number;
		storage_key: string;
		original_name: string;
		mime_type: string;
		size: number;
	}[];
};

/**
 * Publish a pipeline job to the RabbitMQ queue in Celery-compatible format.
 *
 * The message follows Celery's wire protocol so that a Python Celery worker
 * can consume it directly without any adapter.
 */
export async function publishPipelineJob(payload: PipelineJobPayload) {
	const ch = await getChannel();
	const taskId = randomUUIDv7();

	// Celery wire protocol v2 message body: [[args], {kwargs}, {embed}]
	const body = JSON.stringify([
		[payload],  // args
		{},         // kwargs
		{
			callbacks: null,
			errbacks: null,
			chain: null,
			chord: null,
		},
	]);

	const sent = ch.sendToQueue(
		QUEUE_NAME,
		Buffer.from(body),
		{
			persistent: true,
			contentType: "application/json",
			contentEncoding: "utf-8",
			correlationId: taskId,
			replyTo: "",
			headers: {
				lang: "py",
				task: CELERY_TASK_NAME,
				id: taskId,
				root_id: taskId,
				parent_id: null,
				group: null,
				meth: null,
				shadow: null,
				eta: null,
				expires: null,
				retries: 0,
				timelimit: [null, null],
				argsrepr: null,
				kwargsrepr: null,
				origin: "elysia@api",
			},
		},
	);

	if (!sent) {
		throw new Error("Failed to publish pipeline job — channel buffer full");
	}

	console.log(`[RabbitMQ] Published pipeline job ${taskId} for session ${payload.session_id}`);
	return taskId;
}

/**
 * Gracefully close the RabbitMQ connection (call on server shutdown).
 */
export async function closeRabbitMQ() {
	try {
		if (channel)
			await channel.close();
		if (connection)
			await connection.close();
	}
	catch {
		// Best-effort cleanup
	}
	channel = null;
	connection = null;
}
