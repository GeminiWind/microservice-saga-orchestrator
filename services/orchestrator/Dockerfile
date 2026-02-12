FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig*.json ./
COPY libs ./libs
COPY services ./services
CMD ["npm", "run", "dev:orchestrator"]
