#!/bin/bash

# The purpose of this script is to deploy a Harper component using the Harper CLI.
# It requires the Harper admin username and password, target URL, and options for replication and restart.

set -e

HDB_ADMIN_USERNAME=${1:-"HDB_ADMIN"}
HDB_ADMIN_PASSWORD=${2:-"password"}
TARGET=${3:-"http://localhost:9925"}
REPLICATED=${4:-"false"}
RESTART=${5:-"true"}
CONTAINER_NAME=$6

if [ -z "$HDB_ADMIN_USERNAME" ] || [ -z "$HDB_ADMIN_PASSWORD" ] || [ -z "$TARGET" ] || [ -z "$REPLICATED" ] || [ -z "$RESTART" ]; then
  echo "Usage: deploy_harper_cli.sh <hdb_admin_username> <hdb_admin_password> <target> <replicated> <restart>"
  exit 1
fi

echo "Deploying Harper component to target: $TARGET"

# Deploy component to docker
export CLI_TARGET_USERNAME="$HDB_ADMIN_USERNAME"
export CLI_TARGET_PASSWORD="$HDB_ADMIN_PASSWORD"
harper deploy target=$TARGET replicated=$REPLICATED restart=$RESTART


if [ -z "$CONTAINER_NAME" ]; then
  echo "Container name not set, skipping wait for container ready"
else
	# Wait for the container to be ready after restart
	.github/scripts/wait_harper_ready.sh "$CONTAINER_NAME"
fi
