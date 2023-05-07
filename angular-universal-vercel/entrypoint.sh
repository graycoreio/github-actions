#!/bin/bash
set -e

echo "Copy workspace files to /app"
cp -R "${GITHUB_WORKSPACE}/." "/app"

echo "Switch current working directory to app"
cd "/app"

if [ "$INPUT_PROD" = "true" ]
then
  echo "Deploy to Vercel (Prod)"
  DEPLOY_URL=$(VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_VERCEL_PROJECT_ID npx vercel deploy --token=$INPUT_VERCEL_TOKEN --prod)
  echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
else
  echo "Deploy to Vercel"
  DEPLOY_URL=$(VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_VERCEL_PROJECT_ID npx vercel deploy --token=$INPUT_VERCEL_TOKEN)
  echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
fi
