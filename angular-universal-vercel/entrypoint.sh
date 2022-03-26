#!/bin/bash
set -e

echo "Copy workspace files to /app"
cp -R "${GITHUB_WORKSPACE}/." "/app"

echo "Switch current working directory to app"
cd "/app"

if [ "$INPUT_PROD" = "true" ]
then
  echo "Deploy to Vercel (Prod)"
  VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_VERCEL_PROJECT_ID npx vercel --token=$INPUT_VERCEL_TOKEN --prod
else
  echo "Deploy to Vercel"
  VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_VERCEL_PROJECT_ID npx vercel --token=$INPUT_VERCEL_TOKEN
fi
