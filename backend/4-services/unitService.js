import unitRepository from '../5-repositories/unitRepository.js';
import accountRepository from '../5-repositories/accountRepository.js';
import userRepository from '../5-repositories/userRepository.js';
import userSettingsRepository from '../5-repositories/userSettingsRepository.js';

export class UnitService {
  async getAllUnits(_user) {
    // DEV MODE: every user sees every unit.
    const units = await unitRepository.findAll({});
    return units.map(u => u.toJSON());
  }

  async getUnitById(id, _user) {
    const unit = await unitRepository.findById(id);
    if (!unit) {
      throw new Error('Unit not found');
    }
    // DEV MODE: no ownership check.
    return unit.toJSON();
  }

  async createUnit(unitData, user) {
    const data = {
      ...unitData
    };

    // Determine linkType and linkedToId based on unitData or user role
    if (!data.linkType) {
      // Auto-determine based on user role and data
      if (data.linkedToId) {
        // linkedToId is provided - determine linkType from it
        // Check if it's an account ID or user ID
        const account = await accountRepository.findById(data.linkedToId);
        if (account) {
          data.linkType = 'account';
        } else {
          // Assume it's a user ID
          data.linkType = 'user';
        }
      } else if (data.accountId) {
        // accountId provided (for backward compatibility)
        data.linkType = 'account';
        data.linkedToId = data.accountId;
      } else if (user.role === 'complex_owner' || user.role === 'manager') {
        // complex_owner/manager - find their first account
        const userAccounts = await accountRepository.findAll({ userId: user._id });
        if (userAccounts.length > 0) {
          data.linkType = 'account';
          data.linkedToId = userAccounts[0]._id;
        } else {
          throw new Error('אין לך מתחם משויך. אנא צור מתחם תחילה.');
        }
      } else {
        // zimmer_owner or other - link to user
        data.linkType = 'user';
        data.linkedToId = user._id;
      }
    }
    
    // Ensure linkedToId is set if linkType is set
    if (data.linkType && !data.linkedToId) {
      if (data.linkType === 'user') {
        data.linkedToId = user._id;
      } else if (data.linkType === 'account') {
        // Find user's first account
        const userAccounts = await accountRepository.findAll({ userId: user._id });
        if (userAccounts.length > 0) {
          data.linkedToId = userAccounts[0]._id;
        } else {
          throw new Error('אין לך מתחם משויך. אנא צור מתחם תחילה.');
        }
      }
    }

    // Validate based on Settings - כל יצירת צימר חייב לבדוק עם ה-SETTING
    if (data.linkType === 'user') {
      // Unit is linked to a user - check Settings
      const targetUser = await userRepository.findById(data.linkedToId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Get user's UserSettings - חובה לבדוק
      const userSettings = await userSettingsRepository.findById(targetUser.userSettingsId);
      if (!userSettings) {
        throw new Error('User settings not found');
      }

      // If ownerType is 'zimmer_owner', check that user can only have 1 unit
      if (userSettings.ownerType === 'zimmer_owner') {
        const existingUnits = await unitRepository.findAll({ 
          linkType: 'user',
          linkedToId: data.linkedToId 
        });
        if (existingUnits.length >= 1) {
          throw new Error('בעל צימר יכול להגדיר צימר אחד בלבד!');
        }
      }
    } else if (data.linkType === 'account') {
      // Unit is linked to an account - check Settings and account quota
      const account = await accountRepository.findById(data.linkedToId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Check quota for the account - כמה צימרים מאופשרים במתחם
      // Note: numberOfComplexes check is done in createAccount, not here
      const unitsInAccount = await unitRepository.findAll({ 
        linkType: 'account',
        linkedToId: data.linkedToId 
      });
      if (unitsInAccount.length >= account.maxUnits) {
        throw new Error(`המכסה הושלמה! יש ${unitsInAccount.length} צימרים מתוך ${account.maxUnits} מותרים במתחם זה.`);
      }
    }

    const unit = await unitRepository.create(data);
    return unit.toJSON();
  }

  async updateUnit(id, unitData, _user) {
    const unit = await unitRepository.findById(id);
    if (!unit) {
      throw new Error('Unit not found');
    }
    // DEV MODE: no ownership check.
    const updatedUnit = await unitRepository.update(id, unitData);
    return updatedUnit.toJSON();
  }

  async deleteUnit(id, _user) {
    const unit = await unitRepository.findById(id);
    if (!unit) {
      throw new Error('Unit not found');
    }
    // DEV MODE: no ownership check.
    await unitRepository.delete(id);
    return { message: 'Unit deleted successfully' };
  }
}

export default new UnitService();
