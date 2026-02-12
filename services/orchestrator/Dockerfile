FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/orchestrator/package.json services/orchestrator/package.json
RUN npm ci --workspace @app/common --workspace @app/orchestrator

COPY tsconfig.base.json tsconfig.base.json
COPY services/orchestrator/tsconfig.json services/orchestrator/tsconfig.json
COPY libs/common/src libs/common/src
COPY services/orchestrator/src services/orchestrator/src

CMD ["npm", "run", "dev", "--workspace", "@app/orchestrator"]
