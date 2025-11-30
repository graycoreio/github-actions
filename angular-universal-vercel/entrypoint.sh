#!/bin/bash
set -e

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

echo "Copy workspace files to /app"
cp -R "${GITHUB_WORKSPACE}/." "/app"

echo "Copy appropriate serverless files to /api for Angular $INPUT_NG_VERSION with $INPUT_NG_SSR_ENGINE"
if [ "$INPUT_NG_VERSION" -ge 20 ]; then
  cp -R /v20/$INPUT_NG_SSR_ENGINE/* /app
elif [ "$INPUT_NG_VERSION" -ge 17 ]; then
  cp -R /v17/* /app
else
  cp -R /v16/* /app
fi

echo "Switch current working directory to app"
cd "/app"

if [ "$INPUT_PROD" = "true" ]
then
  echo "Deploy to Vercel (Prod)"
  DEPLOY_URL=$(VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_VERCEL_PROJECT_ID npx vercel deploy --token=$INPUT_VERCEL_TOKEN --prod --no-wait)
  echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
else
  echo "Deploy to Vercel"
  DEPLOY_URL=$(VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_VERCEL_PROJECT_ID npx vercel deploy --token=$INPUT_VERCEL_TOKEN --no-wait)
  echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
fi
