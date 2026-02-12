FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/payment-service/package.json services/payment-service/package.json
RUN npm ci --workspace @app/common --workspace @app/payment-service

COPY tsconfig.base.json tsconfig.base.json
COPY services/payment-service/tsconfig.json services/payment-service/tsconfig.json
COPY libs/common/src libs/common/src
COPY services/payment-service/src services/payment-service/src
COPY services/payment-service/migrations services/payment-service/migrations

CMD ["npm", "run", "dev", "--workspace", "@app/payment-service"]
