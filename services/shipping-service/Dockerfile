FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY node_modules ./node_modules
COPY libs ./libs
COPY services ./services
CMD ["npm", "run", "dev:shipping"]
