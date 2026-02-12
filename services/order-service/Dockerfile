FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/order-service/package.json services/order-service/package.json
RUN npm ci --workspace @app/common --workspace @app/order-service

COPY tsconfig.base.json tsconfig.base.json
COPY services/order-service/tsconfig.json services/order-service/tsconfig.json
COPY libs/common/src libs/common/src
COPY services/order-service/src services/order-service/src
COPY services/order-service/migrations services/order-service/migrations

CMD ["npm", "run", "dev", "--workspace", "@app/order-service"]
