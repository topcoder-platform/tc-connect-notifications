FROM node:6
LABEL version="1.0"
LABEL description="Connect Messages Serivce"

RUN npm install -g nodemon

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Install app dependencies
RUN npm install

CMD ["npm", "start"]
