import os

# Broker (RabbitMQ via CloudAMQP)
broker_url = os.environ.get("CELERY_BROKER_URL", "amqp://resumemo:resumemo@localhost:5672//")

# Serialization
accept_content = ["json"]
task_serializer = "json"
result_serializer = "json"

# Task behavior
task_acks_late = True
task_reject_on_worker_lost = True
worker_prefetch_multiplier = 1

# Task routing
task_routes = {
    "pipeline.process_session": {"queue": "profiling.jobs"},
}

# Retry defaults
task_default_retry_delay = 60
task_max_retries = 3

# Timeouts
task_soft_time_limit = 600      # 10 minutes soft limit
task_time_limit = 660           # 11 minutes hard limit

# Disable result backend (results go through HTTP callback)
result_backend = None
