const axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const parse = require('node-html-parser').parse;
const querystring = require('querystring');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const config = require('../config/config.json');
const db = require('../models');

const { BASE_URL, INITIAL, INCOME, EXPENSE, CANCELLED, UNAUTHORIZED } = require('./constants');

const mailer = nodemailer.createTransport({
  host: config.smtp_host,
  port: config.smtp_port,
  auth: {
    user: config.smtp_user,
    pass: config.smtp_password,
  },
});

const emailPayload = {
  from: `"Mi Ticket Wallet" <${config.smtp_user}>`,
  bcc: config.to_email,
  subject: '',
  text: '',
};

const _axios = axios.create({
  withCredentials: true,
  baseURL: BASE_URL,
  headers: {
    Accept:
      '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36',
  },
});

axiosCookieJarSupport(_axios);
_axios.defaults.jar = true;

const doLogin = async () => {
  console.log('Trying to log in...');
  const loginPayload = querystring.stringify({
    Email: config.email,
    Password: config.password,
  });

  await _axios.post('Account/LogIn?Length=7', loginPayload);
};

const checkTicketWallet = async () => {
  try {
    const balance = await _axios.get('MisTarjetas/Saldos');

    if (balance.config.url.includes('Account')) {
      // Request was redirected to Login page
      throw UNAUTHORIZED;
    }

    const balanceRoot = parse(balance.data);
    const cardList = JSON.parse(balanceRoot.querySelector('#txtCardList').getAttribute('value'));

    for (const card of cardList) {
      const { Number } = card;
      const cardEnding = Number.substr(-4);

      const isCardCancelled = await db.Transaction.findOne({
        attributes: ['transactionType'],
        where: {
          cardEnding,
          transactionType: CANCELLED,
        },
      });

      if (isCardCancelled) {
        console.log(`Card ${cardEnding} is cancelled.`);
        break;
      }

      const cardPayload = querystring.stringify({ token: card.Token });
      const cardData = await _axios.post('Cards/Card/GetCardData', cardPayload);
      const { Success, Item } = cardData.data;
      const { Balance: currentBalance } = Item;
      let newTransaction;
      let transactionType;
      let amount;
      let balance = +currentBalance;

      if (Success) {
        const lastTransaction = await db.Transaction.findOne({
          order: [['createdAt', 'DESC']],
          attributes: ['balance'],
          where: {
            cardEnding,
          },
        });

        if (!lastTransaction) {
          newTransaction = true;
          transactionType = INITIAL;
          amount = balance;
        } else {
          const lastBalance = lastTransaction.toJSON().balance;
          amount = currentBalance - lastBalance;
          newTransaction = amount ? true : false;
          transactionType = newTransaction ? (amount < 0 ? EXPENSE : INCOME) : null;
        }

        if (newTransaction) {
          await db.Transaction.create({
            cardEnding,
            transactionType,
            amount,
            balance,
          });

          const formattedAmount = `$${Math.abs(amount).toFixed(2)}`;
          const formattedBalance = `$${balance.toFixed(2)}`;
          const subject = `New ${transactionType} for ${formattedAmount}`;
          const text =
            `Transaction type: ${transactionType}\n` +
            `Amount: ${formattedAmount}*\nBalance: ${formattedBalance}\n\n*` +
            `This amount might represent a single or multiple transactions. All depends on services availability.`;

          console.log(`${subject}. Balance ${formattedBalance}`);

          await mailer.sendMail({
            ...emailPayload,
            subject: subject,
            text: text,
          });
        } else {
          console.log(`No new transaction.`);
        }
      } else if (Item.Status === 'Canceled') {
        const transactionType = CANCELLED;
        const amount = 0;
        const balance = 0;

        await db.Transaction.create({
          cardEnding,
          transactionType,
          amount,
          balance,
        });

        await mailer.sendMail({
          ...emailPayload,
          subject: `Card ${cardEnding} is cancelled`,
          text: `Card ${cardEnding} is cancelled`,
        });
      } else {
        console.log('Error response.');
      }
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      doLogin();
    } else {
      console.log('Error', error);
    }
  }
};

checkTicketWallet();

cron.schedule('*/15 * * * * *', () => {
  checkTicketWallet();
});
