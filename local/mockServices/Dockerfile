FROM node

WORKDIR /json-server

RUN npm install json-server

COPY service.js /json-server/
COPY db.json /json-server/

CMD ["node", "service.js"]

EXPOSE 3001
