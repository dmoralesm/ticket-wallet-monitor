#!/usr/bin/with-contenv sh

CONF_FILE=config/config.json

if [ ! -f "$CONF_FILE" ]; then
  echo "Create config file..."
  mv config/config.sample.json $CONF_FILE
  sed -i "s/TICKET_WALLET_EMAIL/$TICKET_WALLET_EMAIL/g" $CONF_FILE
  sed -i "s/TICKET_WALLET_PASSWORD/$TICKET_WALLET_PASSWORD/g" $CONF_FILE
  sed -i "s/SMTP_HOST/$SMTP_HOST/g" $CONF_FILE
  sed -i "s/SMTP_PORT/$SMTP_PORT/g" $CONF_FILE
  sed -i "s/SMTP_USER/$SMTP_USER/g" $CONF_FILE
  sed -i "s/SMTP_PASSWORD/$SMTP_PASSWORD/g" $CONF_FILE
  sed -i "s/TO_EMAIL/$TO_EMAIL/g" $CONF_FILE
fi

echo "Create db..."
npm run db
echo "Start app..."
npm start
