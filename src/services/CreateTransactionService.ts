import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  category: string;
  type: 'income' | 'outcome';
}
class CreateTransactionService {
  public async execute({
    category,
    title,
    type,
    value,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);
    const balanceRepository = getCustomRepository(TransactionRepository);

    const { total } = await balanceRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('Você não tem salso suficiente!');
    }

    let getCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!getCategory) {
      const createCategory = categoryRepository.create({
        title: category,
      });

      getCategory = await categoryRepository.save(createCategory);
    }

    const transaction = transactionRepository.create({
      type,
      value,
      title,
      category: getCategory,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
