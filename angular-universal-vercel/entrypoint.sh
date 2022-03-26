#!/bin/bash
set -e

if [ "$INPUT_PROD" = "true" ]; 
  echo "Deploy to Vercel (Prod)"
  VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_PROJECT_ID npx vercel --token=$INPUT_VERCEL_TOKEN --prod
else
  echo "Deploy to Vercel"
  VERCEL_ORG_ID=$INPUT_VERCEL_ORG VERCEL_PROJECT_ID=$INPUT_PROJECT_ID npx vercel --token=$INPUT_VERCEL_TOKEN
then




