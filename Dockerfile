# -------- Build Stage --------
FROM node:20-slim AS build

WORKDIR /app

# Prevent ONNX Runtime from trying CUDA/GPU install
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# -------- Runtime Stage --------
FROM node:20-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Prevent ONNX Runtime GPU install at runtime too
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "server/index.js"]
    