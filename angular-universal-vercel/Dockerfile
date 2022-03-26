FROM node:14

RUN npm install -g vercel

COPY vercel.json vercel.json

COPY api api

ENTRYPOINT ["bash", "/entrypoint.sh"]
