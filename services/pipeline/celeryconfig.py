import os

broker_url = os.getenv("CELERY_BROKER_URL", "amqp://resumemo:resumemo@localhost:5672//")
is_windows = os.name == "nt"

accept_content = ["json"]
task_serializer = "json"
result_serializer = "json"

task_acks_late = True
task_reject_on_worker_lost = True
worker_prefetch_multiplier = 1
worker_pool = os.getenv("CELERY_WORKER_POOL", "solo" if is_windows else "prefork")
# worker_concurrency = int(os.getenv("CELERY_WORKER_CONCURRENCY", "1"))
worker_concurrency = 1

task_routes = {
    "pipeline.process_session": {"queue": "profiling.jobs"},
    "pipeline.debug_message": {"queue": "profiling.jobs"},
}

task_default_retry_delay = 60
task_max_retries = 3

task_soft_time_limit = None if is_windows else 600
task_time_limit = None if is_windows else 660

result_backend = None
