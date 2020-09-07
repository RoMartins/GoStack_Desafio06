import csvParse from 'csv-parse';
import fs from 'fs';
import { In, getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';

import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const CategoryRepository = getRepository(Category);

    const contactsReadStrem = fs.createReadStream(filePath);

    const parses = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStrem.pipe(parses);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;

      transactions.push({ title, type, value, category });
      categories.push(category);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentsCategories = await CategoryRepository.find({
      where: In(categories),
    });

    const existentsCategoriesTitles = existentsCategories.map(cat => cat.title);

    const addCategory = categories
      .filter(category => !existentsCategoriesTitles.includes(category))
      .filter(
        (value, index, ArrayCategories) =>
          ArrayCategories.indexOf(value) === index,
      );

    const newCategories = CategoryRepository.create(
      addCategory.map(title => ({
        title,
      })),
    );

    await CategoryRepository.save(newCategories);

    const totalCategories = [...newCategories, ...existentsCategories];

    const createdTransaction = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: totalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransaction);

    await fs.promises.unlink(filePath);

    return createdTransaction;
  }
}

export default ImportTransactionsService;
