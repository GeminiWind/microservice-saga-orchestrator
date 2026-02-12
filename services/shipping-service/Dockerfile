FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs/common/package.json libs/common/package.json
COPY services/shipping-service/package.json services/shipping-service/package.json
RUN npm ci --workspace @app/common --workspace @app/shipping-service

COPY tsconfig.base.json tsconfig.base.json
COPY services/shipping-service/tsconfig.json services/shipping-service/tsconfig.json
COPY libs/common/src libs/common/src
COPY services/shipping-service/src services/shipping-service/src
COPY services/shipping-service/migrations services/shipping-service/migrations

CMD ["npm", "run", "dev", "--workspace", "@app/shipping-service"]
