# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:20-alpine AS execute
WORKDIR /app

# 1. Install 'serve' to host the static files
RUN npm install -g serve

# 2. Copy the contents of build/client into /app
# This includes your newly generated index.html
COPY --from=build /app/build/client .

EXPOSE 3000

# 4. Run 'serve' in Single Page App mode
# -s ensures that if you refresh the page on a sub-route, it loads index.html
CMD ["serve", "-s", ".", "-l", "3000"]