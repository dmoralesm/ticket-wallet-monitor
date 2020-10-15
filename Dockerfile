FROM node:10-alpine

RUN apk add tzdata

WORKDIR /app

COPY . ./

RUN npm install --production
RUN chmod +x ./start.sh

CMD ["sh", "start.sh"]
