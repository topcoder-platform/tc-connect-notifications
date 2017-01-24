FROM node

WORKDIR /json-server

RUN npm install -g json-server

COPY services.json /json-server/
COPY routes.json /json-server/
COPY authMiddleware.js /json-server/

CMD ["json-server", "-p 3001", "-m", "authMiddleware.js", "-r",  "routes.json", "services.json"]

EXPOSE 3001
