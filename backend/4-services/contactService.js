import contactRepository from '../5-repositories/contactRepository.js';

export class ContactService {
  async getAllContacts(_user) {
    // DEV MODE: every user sees every contact.
    const contacts = await contactRepository.findAll({});
    return contacts.map(c => c.toJSON());
  }

  async getContactById(id, user) {
    const contact = await contactRepository.findById(id);
    
    if (!contact) {
      throw new Error('Contact not found');
    }

    // DEV MODE: no ownership check.

    return contact.toJSON();
  }

  async createContact(contactData, user) {
    const data = {
      ...contactData
    };

  
    data.userId = user._id;

    // DEV MODE: accountId optional for all users.
    const accountId = contactData.accountId || user.accountId;
    if (accountId !== undefined && accountId !== null && accountId !== 0) {
      data.accountId = accountId;
    }

    const contact = await contactRepository.create(data);
    return contact.toJSON();
  }

  async updateContact(id, contactData, user) {
    const contact = await contactRepository.findById(id);
    
    if (!contact) {
      throw new Error('Contact not found');
    }

 
    // DEV MODE: no ownership check.

    const updatedContact = await contactRepository.update(id, contactData);
    return updatedContact.toJSON();
  }

  async deleteContact(id, user) {
    const contact = await contactRepository.findById(id);
    
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Check access
    // DEV MODE: no ownership check.

    await contactRepository.delete(id);
    return { message: 'Contact deleted successfully' };
  }
}

export default new ContactService();
