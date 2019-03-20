FROM node:10-alpine
USER node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY . .
EXPOSE 3333
CMD npm start
