FROM node:20-slim

RUN npm install -g vercel

WORKDIR /app

COPY vercel.json vercel.json

COPY entrypoint.sh /entrypoint.sh

COPY api api

ENTRYPOINT ["bash", "/entrypoint.sh"]
