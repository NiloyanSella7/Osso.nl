FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Compile contracten
RUN npx hardhat compile

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 8545
CMD ["/docker-entrypoint.sh"]
