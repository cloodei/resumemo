/**
 * RabbitMQ publisher for dispatching pipeline jobs.
 *
 * Publishes Celery-compatible task messages to the profiling.jobs queue.
 * Uses amqplib with a persistent connection and channel.
 */

import { randomUUIDv7 } from "bun";
import amqplib, { type Connection, type ChannelModel, type Channel } from "amqplib";

const QUEUE_NAME = "profiling.jobs";
const url = process.env.CELERY_BROKER_URL ?? "amqp://resumemo:resumemo@localhost:5672//";

export let connection: Connection | null = null;
export let channel: Channel | null = null;
export let channelModel: ChannelModel | null = null;

async function getChannel() {
	if (channel)
		return channel;

	channelModel = await amqplib.connect(url);
	channel = await channelModel.createChannel();
	connection = channelModel.connection;

	await channel.assertQueue(QUEUE_NAME, { durable: true });
	console.log(`[RabbitMQ] Connected and queue "${QUEUE_NAME}" asserted`);

	connection.on("error", (err) => {
		channelModel = null;
		channel = null;
		connection = null;

		console.error("[RabbitMQ] Connection error:", err.message);
	});

	connection.on("close", () => {
		channelModel = null;
		channel = null;
		connection = null;

		console.warn("[RabbitMQ] Connection closed, will reconnect on next publish");
	});

	return channel;
}

export type PipelineJobPayload = {
	session_id: string;
	run_id: string;
	job_description: string;
	files: {
		file_id: number;
		storage_key: string;
		original_name: string;
	}[];
};

async function publishCeleryTask({ taskName, args, logLabel = "" }: {
	taskName: string;
	args: unknown[];
	logLabel?: string
}) {
	const ch = await getChannel();
	const taskId = randomUUIDv7();

	const body = JSON.stringify([
		args,
		{},
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
				task: taskName,
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

	if (!sent)
		throw new Error(`Failed to publish ${logLabel} — channel buffer full`);

	console.log(`[RabbitMQ] Published ${logLabel} as task ${taskId}`);
	return taskId;
}

/**
 * Publish a pipeline job to the RabbitMQ queue in Celery-compatible format.
 *
 * The message follows Celery's wire protocol so that a Python Celery worker
 * can consume it directly without any adapter.
 */
export async function publishPipelineJob(payload: PipelineJobPayload) {
	return publishCeleryTask({
		taskName: "pipeline.process_session",
		args: [payload],
		logLabel: `pipeline job for session ${payload.session_id}`,
	});
}

/**
 * Gracefully close the RabbitMQ connection (call on server shutdown).
 */
export async function closeRabbitMQ() {
	try {
		if (channel)
			await channel.close();
		if (channelModel)
			await channelModel.close();
	}
	catch {
		// Best-effort cleanup
	}
	channelModel = null;
	channel = null;
	connection = null;
}
