import userRepository from '../5-repositories/userRepository.js';
import userSettingsRepository from '../5-repositories/userSettingsRepository.js';

export class UserService {
  async getAllUsers(_user) {
    // DEV MODE: every user sees every user.
    const users = await userRepository.findAll({});
    // Load UserSettings for each user
    const usersWithSettings = await Promise.all(users.map(async (u) => {
      const userJson = u.toJSON();
      if (u.userSettingsId) {
        const userSettings = await userSettingsRepository.findById(u.userSettingsId);
        if (userSettings) {
          userJson.userSettings = userSettings.toJSON();
        }
      }
      return userJson;
    }));
    return usersWithSettings;
  }

  async getUserById(id, user) {
    const foundUser = await userRepository.findById(id);
    
    if (!foundUser) {
      throw new Error('User not found');
    }

    // DEV MODE: any authenticated user may view any profile.
    const userJson = foundUser.toJSON();
    // Load UserSettings
    if (foundUser.userSettingsId) {
      const userSettings = await userSettingsRepository.findById(foundUser.userSettingsId);
      if (userSettings) {
        userJson.userSettings = userSettings.toJSON();
      }
    }
    return userJson;
  }

  async createUser(userData, _currentUser) {
    // DEV MODE: any authenticated user may create users.
    // Create UserSettings first (required for every user)
    // Determine ownerType based on role or userData
    let ownerType = 'client'; // default for new users (client role)
    if (userData.role === 'admin') {
      ownerType = 'admin';
    } else if (userData.role === 'complex_owner' || userData.role === 'manager') {
      ownerType = 'complex_owner';
    } else if (userData.role === 'zimmer_owner') {
      ownerType = 'zimmer_owner';
    } else if (userData.ownerType) {
      ownerType = userData.ownerType; // Allow explicit setting
    }

    const userSettingsData = {
      ownerType: ownerType,
      numberOfComplexes: userData.numberOfComplexes || 0
    };

    const userSettings = await userSettingsRepository.create(userSettingsData);
    console.log('✅ [UserService] UserSettings created:', userSettings.id);

    // Add userSettingsId to userData
    userData.userSettingsId = userSettings._id;

    const newUser = await userRepository.create(userData);
    return newUser.toJSON();
  }

  async updateUser(id, userData, _currentUser) {
    // DEV MODE: any authenticated user may update any user.
    // Get existing user to check for userSettingsId
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update UserSettings if ownerType or numberOfComplexes are provided
    if (userData.ownerType !== undefined || userData.numberOfComplexes !== undefined) {
      if (existingUser.userSettingsId) {
        // Update existing UserSettings
        const userSettingsUpdate = {};
        if (userData.ownerType !== undefined) {
          userSettingsUpdate.ownerType = userData.ownerType;
        }
        if (userData.numberOfComplexes !== undefined) {
          userSettingsUpdate.numberOfComplexes = userData.numberOfComplexes;
        }
        
        await userSettingsRepository.update(existingUser.userSettingsId, userSettingsUpdate);
        console.log('✅ [UserService] UserSettings updated:', existingUser.userSettingsId, userSettingsUpdate);
      } else {
        // Create new UserSettings if doesn't exist
        let ownerType = 'client'; // default for new users (client role)
        if (userData.role === 'admin') {
          ownerType = 'admin';
        } else if (userData.role === 'complex_owner' || userData.role === 'manager') {
          ownerType = 'complex_owner';
        } else if (userData.role === 'zimmer_owner') {
          ownerType = 'zimmer_owner';
        } else if (userData.ownerType) {
          ownerType = userData.ownerType;
        }

        const userSettingsData = {
          ownerType: ownerType,
          numberOfComplexes: userData.numberOfComplexes || 0
        };

        const newUserSettings = await userSettingsRepository.create(userSettingsData);
        console.log('✅ [UserService] UserSettings created:', newUserSettings.id);
        
        // Link UserSettings to User
        userData.userSettingsId = newUserSettings._id;
      }
    }

    // Remove ownerType and numberOfComplexes from userData (they're in UserSettings, not User)
    const { ownerType, numberOfComplexes, ...userDataWithoutSettings } = userData;

    const updatedUser = await userRepository.update(id, userDataWithoutSettings);
    
    if (!updatedUser) {
      throw new Error('User not found');
    }

    const userJson = updatedUser.toJSON();
    // Load UserSettings to return updated values
    if (updatedUser.userSettingsId) {
      const userSettings = await userSettingsRepository.findById(updatedUser.userSettingsId);
      if (userSettings) {
        userJson.userSettings = userSettings.toJSON();
      }
    }
    return userJson;
  }

  async deleteUser(id, _currentUser) {
    // DEV MODE: any authenticated user may delete any user.
    const deletedUser = await userRepository.delete(id);
    
    if (!deletedUser) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully' };
  }
}

export default new UserService();
