import accountRepository from '../5-repositories/accountRepository.js';
import userRepository from '../5-repositories/userRepository.js';

// DEV MODE: all role / ownership checks removed. Every authenticated user
// can list, read, create, update, and delete every account.

export class AccountService {
  async getAllAccounts(_user) {
    const accounts = await accountRepository.findAll({});
    return accounts.map(a => a.toJSON());
  }

  async getAccountById(id, _user) {
    const account = await accountRepository.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }
    return account.toJSON();
  }

  async createAccount(accountData, user) {
    console.log('📝 [AccountService] createAccount called with data:', accountData);

    // Default the owner to the current user if not supplied.
    if (!accountData.userId) {
      accountData.userId = user._id;
    }

    const accountUser = await userRepository.findById(accountData.userId);
    if (!accountUser) {
      throw new Error('User not found');
    }

    const cleanData = { ...accountData };

    try {
      const account = await accountRepository.create(cleanData);
      console.log('📝 [AccountService] Account created successfully');
      return account.toJSON();
    } catch (error) {
      console.error('📝 [AccountService] Error creating account:', error.message);
      throw error;
    }
  }

  async updateAccount(id, accountData, _user) {
    const account = await accountRepository.update(id, accountData);
    if (!account) {
      throw new Error('Account not found');
    }
    return account.toJSON();
  }

  async deleteAccount(id, _user) {
    console.log('🗑️ [AccountService] deleteAccount called with id:', id);
    const account = await accountRepository.delete(id);
    if (!account) {
      throw new Error('Account not found');
    }
    return { message: 'Account deleted successfully' };
  }
}

export default new AccountService();
