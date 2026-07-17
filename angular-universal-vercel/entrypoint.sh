#!/bin/bash
set -e

# Default inputs that may be unset when an older action.yml (which doesn't
# declare them) runs against the latest image.
INPUT_NG_VERSION="${INPUT_NG_VERSION:-19}"
INPUT_NG_SSR_ENGINE="${INPUT_NG_SSR_ENGINE:-CommonEngine}"
INPUT_NG_OUTPUT_MODE="${INPUT_NG_OUTPUT_MODE:-server}"

# Ensure INPUT_NG_VERSION is a number
if ! [[ "$INPUT_NG_VERSION" =~ ^[0-9]+$ ]]; then
    echo "Error: INPUT_NG_VERSION must be a number" >&2
    exit 1
fi

# Ensure INPUT_NG_SSR_ENGINE is valid
if [ "$INPUT_NG_SSR_ENGINE" != "CommonEngine" ] && [ "$INPUT_NG_SSR_ENGINE" != "AngularNodeAppEngine" ]; then
    echo "Error: INPUT_NG_SSR_ENGINE must be 'CommonEngine' or 'AngularNodeAppEngine'" >&2
    exit 1
fi

# Ensure INPUT_NG_OUTPUT_MODE is valid
if [ "$INPUT_NG_OUTPUT_MODE" != "server" ] && [ "$INPUT_NG_OUTPUT_MODE" != "static" ]; then
    echo "Error: INPUT_NG_OUTPUT_MODE must be 'server' or 'static'" >&2
    exit 1
fi

echo "Copy workspace files to /app"
cp -R "${GITHUB_WORKSPACE}/." "/app"

DEPLOY_FLAGS=()

if [ "$INPUT_NG_OUTPUT_MODE" = "static" ]; then
    if [ ! -d "/app/browser" ]; then
        echo "Error: output mode 'static' expects a prerendered 'browser' directory in the workspace" >&2
        exit 1
    fi

    echo "Assemble Vercel Build Output (static, no SSR function)"
    mkdir -p /app/.vercel/output
    mv /app/browser /app/.vercel/output/static
    cp /static/config.json /app/.vercel/output/config.json
    DEPLOY_FLAGS+=(--prebuilt)
else
    echo "Copy appropriate serverless files to /api for Angular $INPUT_NG_VERSION with $INPUT_NG_SSR_ENGINE"
    if [ "$INPUT_NG_VERSION" -ge 20 ]; then
      cp -R /v20/$INPUT_NG_SSR_ENGINE/* /app
    elif [ "$INPUT_NG_VERSION" -ge 17 ]; then
      cp -R /v17/* /app
    else
      cp -R /v16/* /app
    fi
fi

echo "Switch current working directory to app"
cd "/app"

if [ "$INPUT_PROD" = "true" ]; then
    echo "Deploy to Vercel (Prod)"
    DEPLOY_FLAGS+=(--prod)
else
    echo "Deploy to Vercel"
fi

DEPLOY_URL=$(VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_VERCEL_PROJECT_ID npx vercel deploy "${DEPLOY_FLAGS[@]}" --token=$INPUT_VERCEL_TOKEN --no-wait)
echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
