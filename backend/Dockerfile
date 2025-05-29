# File: backend/Dockerfile

# --- Stage 1: Build stage ---
# Use an official Python runtime as a parent image
FROM python:3.13-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# ENV PATH="$POETRY_HOME/bin:$PATH" # PATH will be updated by venv activation if needed

# Install system dependencies required for uv and potential build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # curl # No longer needed for poetry install
    # Add other build-time dependencies if needed (e.g., for C extensions)
    # build-essential libpq-dev etc.
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup appuser

# Set the working directory
WORKDIR /app

# Copy only the files necessary for installing dependencies
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
# Create a virtual environment within the image
RUN python -m venv /app/.venv
# Activate the venv and install dependencies from uv.lock
RUN . /app/.venv/bin/activate && uv pip sync --frozen-lockfile

# --- Stage 2: Runtime stage ---
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_HOME=/app
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json # Example path, adjust if needed

# Create a non-root user and group (must match builder stage if files are copied with --chown)
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup appuser

# Create application directory
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

# Copy the virtual environment with dependencies from the builder stage
COPY --from=builder /app/.venv $APP_HOME/.venv

# Activate the virtual environment for subsequent RUN, CMD, ENTRYPOINT instructions
ENV PATH="$APP_HOME/.venv/bin:$PATH"

# Copy the application code from the current directory to the container
COPY ./app $APP_HOME/app
# If you have other files/dirs at the root of backend/ to copy, add them here
# COPY ./other_files $APP_HOME/other_files

# Copy Firebase service account key if it's managed outside .env and needs to be in the image
# Make sure this file is present during the build context and handle its security appropriately.
# It's often better to mount secrets or use Google Secret Manager in production.
# COPY serviceAccountKey.json $APP_HOME/serviceAccountKey.json

# Chown the application directory to the non-root user
# Ensure all files copied are owned by appuser for security
RUN chown -R appuser:appgroup $APP_HOME
# If serviceAccountKey.json is copied, ensure its permissions are restrictive
# RUN if [ -f "$APP_HOME/serviceAccountKey.json" ]; then chown appuser:appgroup $APP_HOME/serviceAccountKey.json && chmod 600 $APP_HOME/serviceAccountKey.json; fi


# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application using Uvicorn
# The host 0.0.0.0 is important to allow external connections to the container
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]