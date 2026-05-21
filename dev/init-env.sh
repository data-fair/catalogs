#!/bin/bash

RANDOM_NB=$((1024 + RANDOM % 48000))
echo "Use random base port $RANDOM_NB"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | sed 's/[^a-zA-Z0-9-]/-/g')
DEV_HOST="${BRANCH:-df}.localhost"

cat <<EOF > ".env"
DEV_HOST=${DEV_HOST}

NGINX_PORT=$((RANDOM_NB))

DEV_API_PORT=$((RANDOM_NB + 10))
DEV_UI_PORT=$((RANDOM_NB + 11))
DEV_UI_HMR_PORT=$((RANDOM_NB + 12))

MONGO_PORT=$((RANDOM_NB + 20))
ES_PORT=$((RANDOM_NB + 21))

SD_PORT=$((RANDOM_NB + 30))
EVENTS_PORT=$((RANDOM_NB + 31))
DF_PORT=$((RANDOM_NB + 32))
REGISTRY_PORT=$((RANDOM_NB + 33))
EOF

echo ".env file created"
