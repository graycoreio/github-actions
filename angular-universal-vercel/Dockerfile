FROM node:20-slim

RUN npm install -g vercel

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh

COPY v16 /v16
COPY v17 /v17
COPY v20 /v20

ENTRYPOINT ["bash", "/entrypoint.sh"]
