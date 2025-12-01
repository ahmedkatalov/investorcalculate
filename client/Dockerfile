# --- BUILD STAGE ---
FROM node:22-alpine AS build
WORKDIR /app

# принимаем API URL от docker-compose
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build


# --- RUN STAGE ---
FROM nginx:1.27-alpine

# чистая статика из Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
