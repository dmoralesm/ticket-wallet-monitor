'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Transaction.init(
    {
      cardEnding: {
        type: DataTypes.TEXT,
      },
      transactionType: {
        type: DataTypes.TEXT,
      },
      acceptor: {
        type: DataTypes.TEXT,
      },
      amount: {
        type: DataTypes.DECIMAL,
      },
      balance: {
        type: DataTypes.DECIMAL,
      },
    },
    {
      sequelize,
      modelName: 'Transaction',
    }
  );
  return Transaction;
};
