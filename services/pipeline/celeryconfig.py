import os

broker_url = os.environ.get("CELERY_BROKER_URL", "amqp://resumemo:resumemo@localhost:5672//")

accept_content = ["json"]
task_serializer = "json"
result_serializer = "json"

task_acks_late = True
task_reject_on_worker_lost = True
worker_prefetch_multiplier = 1

task_routes = {
    "pipeline.process_session": {"queue": "profiling.jobs"},
}

task_default_retry_delay = 60
task_max_retries = 3

task_soft_time_limit = 600
task_time_limit = 660

result_backend = None
