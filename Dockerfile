# Specify the base Docker image
FROM apify/actor-node:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && npm list \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

# Copy source code
COPY . ./

# Run the actor
CMD ["npm", "start"]
