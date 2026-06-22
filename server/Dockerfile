FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy server source code
COPY . .

# Expose API port
EXPOSE 3001

# Start the Node.js server
CMD ["npm", "start"]
