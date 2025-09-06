# STILL DOESNT WORK

# Stage 1: Install development dependencies
FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Install production dependencies
FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
COPY package*.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 3: Build the Vite SPA
FROM node:20-alpine AS build-env
WORKDIR /app
COPY . .
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN npm run build

# Stage 4: Final production image
FROM node:20-alpine
WORKDIR /app

# Copy production dependencies
COPY package*.json ./
COPY --from=production-dependencies-env /app/node_modules /app/node_modules

# Copy built SPA
COPY --from=build-env /app/build /app/build

# Install global static server
RUN npm install -g serve

# Expose port Cloud Run expects
EXPOSE 8080

# Start SPA server on all interfaces at port 8080
CMD ["npm", "run", "start"]
